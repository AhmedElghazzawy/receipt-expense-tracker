// `pnpm eval [--provider ollama|gemini] [--model name]`: field accuracy and latency on the
// golden set (docs/MODEL_ROUTING.md). Without --model, rules only. With it, two runs:
// the model alone on each document, then the full pipeline with the model as tier 1 or 2.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { normalizeMerchant } from "../src/lib/normalize";
import { createDb, migrateDb } from "../src/server/db/client";
import { listCategories } from "../src/server/db/expenses";
import { seedDefaults } from "../src/server/db/seed";
import { parseEnv } from "../src/server/env";
import { sniffFileType } from "../src/server/extraction/input";
import { ocrImage, terminateOcr } from "../src/server/extraction/ocr";
import { extractPdfText } from "../src/server/extraction/pdf-text";
import { extractDocument, type ModelStep } from "../src/server/extraction/pipeline";
import { GeminiProvider } from "../src/server/llm/gemini";
import { createModelStep } from "../src/server/llm/model-step";
import { OllamaProvider } from "../src/server/llm/ollama";
import { parseModelOutput } from "../src/server/llm/prompt";
import type { LlmProvider } from "../src/server/llm/types";

type Expected = { amountMinor: number; currency: string; date: string; merchant: string; category: string; documentType: string };
type Case = { file: string; today: string; expected: Expected };
type Got = { [K in keyof Expected]?: string | number | null };

const here = dirname(fileURLToPath(import.meta.url));
const cases: Case[] = JSON.parse(readFileSync(join(here, "cases.json"), "utf8"));
const fields = ["amountMinor", "currency", "date", "merchant", "category", "documentType"] as const;

const freshDb = () => {
  const db = createDb(":memory:"); // no cache or memory carry-over between cases
  migrateDb(db);
  seedDefaults(db);
  return db;
};

/** Runs `extract` on every case and prints per-field accuracy and latency. */
async function report(label: string, extract: (c: Case, bytes: Uint8Array) => Promise<{ got: Got; note: string } | null>) {
  const correct = Object.fromEntries(fields.map((f) => [f, 0])) as Record<(typeof fields)[number], number>;
  const scored = new Set<string>();
  const rows: string[] = [];
  let totalMs = 0;
  let runs = 0;

  for (const c of cases) {
    const t0 = performance.now();
    const out = await extract(c, new Uint8Array(readFileSync(join(here, c.file))));
    const ms = performance.now() - t0;
    if (!out) {
      rows.push(`- ${c.file.padEnd(28)} skipped`);
      continue;
    }
    totalMs += ms;
    runs++;
    const misses: string[] = [];
    for (const f of fields) {
      if (!(f in out.got)) continue;
      scored.add(f);
      const got = out.got[f];
      const ok =
        f === "merchant"
          ? normalizeMerchant(String(got ?? "")).startsWith(normalizeMerchant(c.expected.merchant))
          : got === c.expected[f];
      if (ok) correct[f]++;
      else misses.push(`${f}: got ${JSON.stringify(got)}, want ${JSON.stringify(c.expected[f])}`);
    }
    rows.push(`${misses.length ? "✗" : "✓"} ${c.file.padEnd(28)} ${ms.toFixed(0).padStart(5)} ms  ${out.note}${misses.map((m) => `\n    ${m}`).join("")}`);
  }

  console.log(`\nEval (${label}) — ${runs} of ${cases.length} documents\n`);
  console.log(rows.join("\n"));
  console.log("\nField accuracy:");
  for (const f of fields) {
    if (scored.has(f)) console.log(`  ${f.padEnd(13)} ${((correct[f] / runs) * 100).toFixed(0).padStart(4)}%`);
  }
  console.log(`\nMean latency: ${runs ? (totalMs / runs).toFixed(0) : "-"} ms`);
}

export async function runEval(modelStep?: ModelStep, label = "rules only") {
  await report(label, async (c, bytes) => {
    const { result } = await extractDocument(bytes, { db: freshDb(), today: c.today, modelStep });
    const got: Got = Object.fromEntries(Object.entries(result.fields).map(([k, f]) => [k, f.value]));
    got.documentType = result.document.type;
    return { got, note: `tier ${result.source.tier} ${result.source.provider}` };
  });
}

/** The model on its own: document text (and, for cloud, the file), no rule hints. */
async function runModelOnly(provider: LlmProvider) {
  const categories = listCategories(freshDb()).map((c) => c.name);
  await report(`${provider.name} alone`, async (c, bytes) => {
    // Same privacy rule as the app: dekonts never go to the cloud.
    if (provider.tier > 1 && c.expected.documentType === "dekont") return null;
    const type = sniffFileType(bytes)!;
    const text = type.kind === "pdf" ? await extractPdfText(bytes) : (await ocrImage(bytes)).text;
    const file = provider.tier > 1 ? { mimeType: type.mimeType, data: bytes } : undefined;
    try {
      const out = parseModelOutput(await provider.extract({ text, file, categories }), categories);
      const got: Got = Object.fromEntries(Object.entries(out).map(([k, f]) => [k, f.value]));
      for (const f of ["amountMinor", "currency", "date", "merchant", "category"] as const) got[f] ??= null;
      return { got, note: provider.name };
    } catch (error) {
      return { got: { amountMinor: null, currency: null, date: null, merchant: null, category: null }, note: `failed: ${String(error)}` };
    }
  });
}

async function main() {
  const { values } = parseArgs({ options: { provider: { type: "string", default: "ollama" }, model: { type: "string" } } });
  if (!values.model) return runEval();

  const env = parseEnv(process.env);
  let provider: LlmProvider;
  if (values.provider === "ollama") {
    provider = new OllamaProvider(env.OLLAMA_HOST, values.model);
  } else if (values.provider === "gemini") {
    if (!env.GEMINI_API_KEY) throw new Error("Set GEMINI_API_KEY in .env to evaluate Gemini");
    provider = new GeminiProvider(env.GEMINI_API_KEY, values.model);
  } else {
    throw new Error(`Unknown provider: ${values.provider}`);
  }

  await runModelOnly(provider);
  const db = freshDb();
  const isLocal = provider.tier === 1;
  // The pipeline run uses a throwaway DB for the cloud counter; each case gets its own extraction DB.
  const step = createModelStep({
    db,
    today: cases[0]!.today,
    privacyMode: "smart",
    cloudDailyCap: env.CLOUD_DAILY_CAP,
    local: isLocal ? provider : undefined,
    cloud: isLocal ? [] : [provider],
  });
  await runEval(step, `pipeline + ${provider.name}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } finally {
    await terminateOcr();
  }
}
