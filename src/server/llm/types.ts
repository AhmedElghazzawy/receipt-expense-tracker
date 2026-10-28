import type { ExtractedFields } from "@/server/extraction/result";

/** 1 = local Ollama, 2 = Gemini free tier, 3 = optional second free cloud API. */
export type ProviderTier = 1 | 2 | 3;

export type ExtractionInput = {
  /** OCR or PDF text, already masked if it may leave the machine. */
  text?: string;
  /** Rule-pass candidates the model should confirm or fill in. */
  candidates?: Partial<ExtractedFields>;
  /** Raw document, only for cloud tiers when privacy mode allows it. */
  file?: { mimeType: string; data: Uint8Array };
  /** Known category names the model must choose from. */
  categories: string[];
};

export interface LlmProvider {
  readonly name: string;
  readonly tier: ProviderTier;
  /** Returns raw model JSON. Callers must validate it (see parseProviderOutput). */
  extract(input: ExtractionInput, opts?: { signal?: AbortSignal }): Promise<unknown>;
}

export type ProviderErrorKind = "rate_limited" | "unavailable" | "invalid_output" | "other";

/** Lets the router decide whether to back off, fall back, or give up. */
export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ProviderError";
  }
}
