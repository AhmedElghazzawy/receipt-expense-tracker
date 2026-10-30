import { z } from "zod";
import { minorToDecimalString, parseAmount } from "@/lib/money";
import type { ExtractedFields } from "@/server/extraction/result";
import { type ExtractionInput, ProviderError } from "./types";

/**
 * Models return the amount as a decimal string ("297.40"), never a number: code turns it
 * into minor units with string math so no float ever touches money.
 */
const field = (value: Record<string, unknown>) => ({
  type: "object",
  properties: {
    value: { ...value, type: [value.type, "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["value", "confidence"],
});

/** JSON schema for structured output (Ollama `format`, Gemini `responseJsonSchema`). */
export function outputJsonSchema(categories: string[]) {
  return {
    type: "object",
    properties: {
      amount: field({ type: "string", description: "Grand total paid, e.g. 1234.56" }),
      currency: field({ type: "string", description: "ISO 4217 code, e.g. TRY" }),
      date: field({ type: "string", description: "Transaction date, YYYY-MM-DD" }),
      merchant: field({ type: "string", description: "Business or payee name" }),
      category: field({ type: "string", enum: [...categories, null] }),
    },
    required: ["amount", "currency", "date", "merchant", "category"],
  };
}

const rawField = z.object({ value: z.string().nullable(), confidence: z.number().min(0).max(1) });
const rawOutputSchema = z
  .object({
    amount: rawField,
    currency: rawField,
    date: rawField,
    merchant: rawField,
    category: rawField,
  })
  .partial();

/**
 * Turns raw model JSON into pipeline fields. Anything malformed is dropped field by field;
 * the pipeline validates the result again before merging.
 */
export function parseModelOutput(raw: unknown, categories: string[]): Partial<ExtractedFields> {
  const parsed = rawOutputSchema.safeParse(raw);
  if (!parsed.success) throw new ProviderError("invalid_output", "Model output did not match the schema");
  const o = parsed.data;
  const out: Partial<ExtractedFields> = {};

  const amountMinor = o.amount?.value ? parseAmount(o.amount.value) : null;
  if (o.amount && amountMinor !== null) out.amountMinor = { value: amountMinor, confidence: o.amount.confidence };

  const currency = o.currency?.value?.trim().toUpperCase();
  if (o.currency && currency && /^[A-Z]{3}$/.test(currency)) out.currency = { value: currency, confidence: o.currency.confidence };

  const date = o.date?.value?.trim();
  if (o.date && date && z.iso.date().safeParse(date).success) out.date = { value: date, confidence: o.date.confidence };

  const merchant = o.merchant?.value?.trim();
  if (o.merchant && merchant) out.merchant = { value: merchant.slice(0, 200), confidence: o.merchant.confidence };

  // Category must be one the user has; anything invented is ignored.
  const category = categories.find((c) => c === o.category?.value?.trim());
  if (o.category && category) out.category = { value: category, confidence: o.category.confidence };

  return out;
}

/** Short instruction prompt; the schema carries the structure. */
export function buildPrompt(input: ExtractionInput): string {
  const lines = [
    "Extract the expense from this receipt or bank transfer document (often Turkish).",
    "amount: the grand total actually paid (TOPLAM / İşlem Tutarı), not VAT (KDV), subtotal, or change.",
    "Write amount with a dot as decimal separator and no thousands separators, e.g. 1234.56.",
    "currency: ISO code; TL, ₺, or a Turkish document without another currency means TRY.",
    "date: the transaction date as YYYY-MM-DD. Turkish dates are DD.MM.YYYY.",
    "merchant: the shop or payee name, without legal suffixes when obvious.",
    `category: one of ${input.categories.join(", ")}; null if unsure.`,
    "Use null for anything not in the document. confidence is 0-1: how sure you are of each value.",
  ];
  const hints = candidateHints(input.candidates ?? {});
  if (Object.keys(hints).length > 0) {
    lines.push("", `Values found by simple rules (may be wrong): ${JSON.stringify(hints)}`);
  }
  if (input.text) lines.push("", "Document text:", input.text);
  return lines.join("\n");
}

/** Rule candidates in the model's vocabulary (amount as a decimal string), nulls left out. */
function candidateHints(candidates: Partial<ExtractedFields>): Record<string, string> {
  const hints: Record<string, string> = {};
  if (candidates.amountMinor?.value) hints.amount = minorToDecimalString(candidates.amountMinor.value);
  for (const key of ["currency", "date", "merchant", "category"] as const) {
    const value = candidates[key]?.value;
    if (value) hints[key] = value;
  }
  return hints;
}
