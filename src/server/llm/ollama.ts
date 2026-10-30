import { buildPrompt, outputJsonSchema } from "./prompt";
import { type ExtractionInput, type LlmProvider, ProviderError } from "./types";

/** Small local models answer in a few seconds; first load can take longer. */
const TIMEOUT_MS = 60_000;

type Fetch = typeof fetch;

/** Tier 1: a small local text model via Ollama's /api/chat. Text only, nothing leaves the machine. */
export class OllamaProvider implements LlmProvider {
  readonly name: string;
  readonly tier = 1 as const;

  constructor(
    private readonly host: string,
    private readonly model: string,
    private readonly fetchFn: Fetch = fetch,
  ) {
    this.name = `ollama:${model}`;
  }

  async extract(input: ExtractionInput, opts?: { signal?: AbortSignal }): Promise<unknown> {
    if (!input.text?.trim()) throw new ProviderError("unavailable", "Ollama needs document text");

    let res: Response;
    try {
      res = await this.fetchFn(new URL("/api/chat", this.host), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          think: false,
          // Free memory soon after: one model at a time on a 16 GB Mac (docs/MODEL_ROUTING.md).
          keep_alive: "2m",
          format: outputJsonSchema(input.categories),
          options: { temperature: 0 },
          messages: [{ role: "user", content: buildPrompt(input) }],
        }),
        signal: withTimeout(opts?.signal),
      });
    } catch (cause) {
      throw new ProviderError("unavailable", "Ollama is not reachable", { cause });
    }

    if (!res.ok) {
      // 404 means the model isn't pulled.
      const kind = res.status === 404 || res.status >= 500 ? "unavailable" : "other";
      throw new ProviderError(kind, `Ollama returned ${res.status}`);
    }
    const body = (await res.json().catch(() => null)) as { message?: { content?: unknown } } | null;
    return parseJsonContent(body?.message?.content, "Ollama");
  }

  /** Whether Ollama runs and has this model pulled (for the settings screen). */
  async status(): Promise<"ready" | "model_missing" | "offline"> {
    try {
      const res = await this.fetchFn(new URL("/api/tags", this.host), { signal: AbortSignal.timeout(2_000) });
      if (!res.ok) return "offline";
      const body = (await res.json()) as { models?: { name?: string; model?: string }[] };
      const names = (body.models ?? []).flatMap((m) => [m.name, m.model]);
      const wanted = this.model.includes(":") ? this.model : `${this.model}:latest`;
      return names.includes(wanted) ? "ready" : "model_missing";
    } catch {
      return "offline";
    }
  }
}

export function withTimeout(signal: AbortSignal | undefined, ms = TIMEOUT_MS): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export function parseJsonContent(content: unknown, provider: string): unknown {
  if (typeof content !== "string") throw new ProviderError("invalid_output", `${provider} returned no content`);
  try {
    return JSON.parse(content);
  } catch (cause) {
    throw new ProviderError("invalid_output", `${provider} returned invalid JSON`, { cause });
  }
}
