import type { ExtractedFields } from "./result";

type Key = keyof ExtractedFields;
const keys: Key[] = ["amountMinor", "currency", "date", "merchant", "category"];

/**
 * Later steps only fill gaps or replace less certain values (extraction-pipeline skill).
 * Returns the merged fields and which keys the update actually changed.
 */
export function mergeFields(base: ExtractedFields, update: Partial<ExtractedFields>) {
  const merged = { ...base };
  const changed: Key[] = [];
  for (const key of keys) {
    const next = update[key];
    if (!next || next.value === null) continue;
    const current = base[key];
    if (current.value === null || next.confidence > current.confidence) {
      (merged as Record<Key, unknown>)[key] = next;
      changed.push(key);
    }
  }
  return { fields: merged, changed };
}

/** Fields whose confidence is below the review threshold. */
export function uncertainFields(fields: ExtractedFields, threshold: number): Key[] {
  return keys.filter((k) => k !== "category" && fields[k].confidence < threshold);
}
