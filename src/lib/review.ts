import type { ExtractionResult } from "@/server/extraction/result";
import { LOW_CONFIDENCE } from "@/server/extraction/result";
import { currencies, DEFAULT_CURRENCY, minorToDecimalString } from "./money";

type FormField = "amount" | "currency" | "date" | "merchant" | "categoryId" | "note";
type FormInitial = Record<FormField, string>;

/**
 * Extraction result -> review form values plus the fields to double-check.
 * Missing or low-confidence values are flagged; nothing here is trusted yet.
 */
export function reviewInitial(
  result: ExtractionResult,
  categories: { id: number; name: string }[],
  today: string,
): { initial: FormInitial; uncertain: Set<FormField> } {
  const f = result.fields;
  const unsure = (field: { value: unknown; confidence: number }) => field.value === null || field.confidence < LOW_CONFIDENCE;
  const uncertain = new Set<FormField>();

  const amount = f.amountMinor.value ? turkishAmount(f.amountMinor.value) : "";
  if (unsure(f.amountMinor)) uncertain.add("amount");

  const currency = currencies.find((c) => c === f.currency.value) ?? DEFAULT_CURRENCY;
  if (unsure(f.currency) || currency !== f.currency.value) uncertain.add("currency");

  const date = f.date.value ?? today;
  if (unsure(f.date)) uncertain.add("date");

  const merchant = f.merchant.value ?? "";
  if (unsure(f.merchant)) uncertain.add("merchant");

  const category = categories.find((c) => c.name === f.category.value);
  if (!category || f.category.confidence < LOW_CONFIDENCE) uncertain.add("categoryId");

  return {
    initial: { amount, currency, date, merchant, categoryId: category ? String(category.id) : "", note: "" },
    uncertain,
  };
}

/** 123456 -> "1.234,56": how the form shows amounts (and parseAmount reads them back). */
function turkishAmount(amountMinor: number): string {
  const [whole = "0", fraction = "00"] = minorToDecimalString(amountMinor).split(".");
  return `${whole.replace(/\B(?=(\d{3})+$)/g, ".")},${fraction}`;
}

/** Plain words for where the values came from (docs/MODEL_ROUTING.md: show the tier). */
export function sourceLabel(source: ExtractionResult["source"]): { text: string; cloud: boolean } {
  if (source.tier === 0) return { text: "Read on this device", cloud: false };
  if (source.tier === 1) return { text: "Read by the local AI model", cloud: false };
  return { text: "Read by a cloud AI model", cloud: true };
}
