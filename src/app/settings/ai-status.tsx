import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { todayIso } from "@/lib/dates";
import { getDb } from "@/server/db/client";
import { cloudCallsOn } from "@/server/db/usage";
import { getEnv, type PrivacyMode } from "@/server/env";
import { OllamaProvider } from "@/server/llm/ollama";

const modes: Record<PrivacyMode, { name: string; detail: string }> = {
  smart: {
    name: "Smart",
    detail: "Dekonts and PDFs stay on this device. A receipt photo goes to the cloud only if it can't be read here.",
  },
  local_only: { name: "Local only", detail: "Nothing leaves this device. Hard documents fall back to typing." },
  cloud_first: { name: "Cloud first", detail: "Receipt photos go to the cloud for best accuracy. Dekonts still stay here." },
};

const ollamaText = {
  ready: { label: "Running", variant: "secondary" },
  model_missing: { label: "Model not pulled", variant: "outline" },
  offline: { label: "Not running", variant: "outline" },
} as const;

/** Privacy mode and model status. Reads env and pings Ollama; never shows keys. */
export async function AiStatus() {
  await connection();
  const env = getEnv();
  const mode = modes[env.PRIVACY_MODE];
  const ollama = env.LLM_LOCAL_MODEL ? await new OllamaProvider(env.OLLAMA_HOST, env.LLM_LOCAL_MODEL).status() : null;
  const cloudOn = Boolean(env.GEMINI_API_KEY && env.LLM_CLOUD_MODEL);
  const calls = cloudCallsOn(getDb(), todayIso());

  return (
    <dl className="flex flex-col divide-y">
      <Row term="Privacy mode" value={<Badge variant="secondary">{mode.name}</Badge>} detail={mode.detail} />
      <Row
        term="Local AI"
        value={
          ollama ? (
            <Badge variant={ollamaText[ollama].variant}>{ollamaText[ollama].label}</Badge>
          ) : (
            <Badge variant="outline">Off</Badge>
          )
        }
        detail={
          ollama
            ? `Ollama · ${env.LLM_LOCAL_MODEL}${ollama === "model_missing" ? ` (run: ollama pull ${env.LLM_LOCAL_MODEL})` : ""}`
            : "Set LLM_LOCAL_MODEL to use a local model. Rules and OCR still work without it."
        }
      />
      <Row
        term="Cloud AI"
        value={<Badge variant={cloudOn ? "secondary" : "outline"}>{cloudOn ? "On" : "Off"}</Badge>}
        detail={
          cloudOn
            ? `Gemini · ${env.LLM_CLOUD_MODEL} · ${calls} of ${env.CLOUD_DAILY_CAP} calls today (stops at 80%)`
            : "Set GEMINI_API_KEY and LLM_CLOUD_MODEL to use the free Gemini tier."
        }
      />
    </dl>
  );
}

function Row({ term, value, detail }: { term: string; value: React.ReactNode; detail: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
      <dt className="font-medium">{term}</dt>
      <dd>{value}</dd>
      <dd className="col-span-2 text-sm break-words text-muted-foreground">{detail}</dd>
    </div>
  );
}

export function AiStatusSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
