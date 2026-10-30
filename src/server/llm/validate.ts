import { z } from "zod";
import { type ExtractedFields, extractedFieldsSchema } from "@/server/extraction/result";
import { ProviderError } from "./types";

/** Model output is untrusted: parse it or throw invalid_output. */
export function parseProviderOutput(raw: unknown): ExtractedFields {
  const result = extractedFieldsSchema.safeParse(raw);
  if (!result.success) {
    throw new ProviderError("invalid_output", z.prettifyError(result.error), { cause: result.error });
  }
  return result.data;
}
