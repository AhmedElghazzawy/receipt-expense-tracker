import { parseJsonContent, withTimeout } from "./ollama";
import { buildPrompt, outputJsonSchema } from "./prompt";
import { type ExtractionInput, type LlmProvider, ProviderError } from "./types";

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 45_000;

type Fetch = typeof fetch;

/**
 * Tier 2: Gemini free tier via generateContent (stateless; the newer Interactions API
 * stores requests by default). Sends masked text and, when given, the document itself.
 */
export class GeminiProvider implements LlmProvider {
  readonly name: string;
  readonly tier = 2 as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchFn: Fetch = fetch,
  ) {
    this.name = `gemini:${model}`;
  }

  async extract(input: ExtractionInput, opts?: { signal?: AbortSignal }): Promise<unknown> {
    const parts: Record<string, unknown>[] = [{ text: buildPrompt(input) }];
    if (input.file) {
      parts.push({
        inline_data: { mime_type: input.file.mimeType, data: Buffer.from(input.file.data).toString("base64") },
      });
    }

    let res: Response;
    try {
      res = await this.fetchFn(`${API}/${encodeURIComponent(this.model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseJsonSchema: outputJsonSchema(input.categories),
          },
        }),
        signal: withTimeout(opts?.signal, TIMEOUT_MS),
      });
    } catch (cause) {
      throw new ProviderError("unavailable", "Gemini is not reachable", { cause });
    }

    if (res.status === 429) throw new ProviderError("rate_limited", "Gemini rate limit reached");
    if (res.status >= 500) throw new ProviderError("unavailable", `Gemini returned ${res.status}`);
    if (!res.ok) throw new ProviderError("other", `Gemini returned ${res.status}`);

    const body = (await res.json().catch(() => null)) as {
      candidates?: { content?: { parts?: { text?: unknown }[] } }[];
    } | null;
    return parseJsonContent(body?.candidates?.[0]?.content?.parts?.[0]?.text, "Gemini");
  }
}
