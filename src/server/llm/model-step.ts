import type { Db } from "@/server/db/client";
import { cloudCallsOn, recordCloudCall } from "@/server/db/usage";
import type { Env, PrivacyMode } from "@/server/env";
import { maskSensitive } from "@/server/extraction/mask";
import { mergeFields, uncertainFields } from "@/server/extraction/merge";
import { GOOD_OCR_CONFIDENCE, type ModelStep, type ModelStepInput, type ModelStepOutput } from "@/server/extraction/pipeline";
import { type ExtractedFields, LOW_CONFIDENCE } from "@/server/extraction/result";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import { parseModelOutput } from "./prompt";
import { cloudBudgetLeft, cloudPolicy } from "./router";
import { type ExtractionInput, type LlmProvider, ProviderError } from "./types";

export type ModelStepDeps = {
  db: Db;
  today: string;
  privacyMode: PrivacyMode;
  cloudDailyCap: number;
  /** Tier 1. */
  local?: LlmProvider;
  /** Tiers 2-3, tried in order. */
  cloud?: LlmProvider[];
  /** Backoff before the one retry after a 429 or 5xx. */
  backoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

/** Tiers 1-3 with privacy routing, daily cap, and fallback (docs/MODEL_ROUTING.md). */
export function createModelStep(deps: ModelStepDeps): ModelStep {
  const cloud = deps.cloud ?? [];
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  return async (input) => {
    const { policy } = cloudPolicy({
      privacyMode: deps.privacyMode,
      documentType: input.documentType,
      inputKind: input.inputKind,
      cloudCallsToday: cloudCallsOn(deps.db, deps.today),
      cloudDailyCap: deps.cloudDailyCap,
      cloudConfigured: cloud.length > 0,
    });

    const runLocal = async () => {
      if (!deps.local || !input.text.trim()) return null;
      return attempt(deps.local, providerInput(input, input.text), input.categories);
    };

    const runCloud = async () => {
      // Text leaving the machine is masked. A text-layer PDF's text is exact, so the file
      // itself stays home; photos and scans need the document attached.
      const file = input.inputKind === "text_pdf" ? undefined : { mimeType: input.file.mimeType, data: input.file.bytes };
      const request = { ...providerInput(input, maskSensitive(input.text)), file };
      for (const provider of cloud) {
        for (let retry = 0; retry < 2; retry++) {
          if (!cloudBudgetLeft(cloudCallsOn(deps.db, deps.today), deps.cloudDailyCap)) return null;
          recordCloudCall(deps.db, deps.today);
          const out = await attempt(provider, request, input.categories);
          if (out !== "retry") {
            if (out) return out;
            break;
          }
          if (retry === 0) await sleep(deps.backoffMs ?? 1_000);
        }
      }
      return null;
    };

    if (policy === "first") return settle(await runCloud()) ?? settle(await runLocal());

    const local = settle(await runLocal());
    if (policy === "fallback" && needsCloud(input, local)) {
      const fromCloud = settle(await runCloud());
      if (fromCloud) return fromCloud;
    }
    return local;
  };
}

/** Builds the step from env; undefined when no model is configured (rules only). */
export function modelStepFromEnv(env: Env, db: Db, today: string): ModelStep | undefined {
  const local = env.LLM_LOCAL_MODEL ? new OllamaProvider(env.OLLAMA_HOST, env.LLM_LOCAL_MODEL) : undefined;
  const cloud = env.GEMINI_API_KEY && env.LLM_CLOUD_MODEL ? [new GeminiProvider(env.GEMINI_API_KEY, env.LLM_CLOUD_MODEL)] : [];
  if (!local && cloud.length === 0) return undefined;
  return createModelStep({ db, today, privacyMode: env.PRIVACY_MODE, cloudDailyCap: env.CLOUD_DAILY_CAP, local, cloud });
}

function providerInput(input: ModelStepInput, text: string): ExtractionInput {
  const candidates = Object.fromEntries(Object.entries(input.fields).filter(([, f]) => f.value !== null));
  return { text, candidates, categories: input.categories };
}

/** One provider call. "retry" = worth one backoff and retry (429, 5xx, offline). */
async function attempt(
  provider: LlmProvider,
  request: ExtractionInput,
  categories: string[],
): Promise<ModelStepOutput | null | "retry"> {
  try {
    const fields = parseModelOutput(await provider.extract(request), categories);
    return { fields, provider: provider.name, tier: provider.tier };
  } catch (error) {
    const kind = error instanceof ProviderError ? error.kind : "other";
    // Log the kind only: never document content.
    console.warn(`[extract] ${provider.name} failed: ${kind}`);
    return provider.tier > 1 && (kind === "rate_limited" || kind === "unavailable") ? "retry" : null;
  }
}

const settle = (out: ModelStepOutput | null | "retry") => (out === "retry" ? null : out);

/** Smart mode: go to the cloud only when local text is unreliable or tier 1 left gaps. */
function needsCloud(input: ModelStepInput, local: ModelStepOutput | null): boolean {
  if (input.inputKind === "scanned_pdf" || !input.text.trim()) return true;
  if (input.ocrConfidence !== null && input.ocrConfidence < GOOD_OCR_CONFIDENCE) return true;
  const fields: ExtractedFields = local ? mergeFields(input.fields, local.fields).fields : input.fields;
  return uncertainFields(fields, LOW_CONFIDENCE).length > 0;
}
