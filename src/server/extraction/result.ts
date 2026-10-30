import { z } from "zod";

/** Fields below this confidence are flagged on the review screen. */
export const LOW_CONFIDENCE = 0.7;

const field = <T extends z.ZodType>(value: T) =>
  z.object({
    value: value.nullable(),
    confidence: z.number().min(0).max(1),
  });

/** What any extraction step (rules, memory, model) may produce. Untrusted until parsed. */
export const extractedFieldsSchema = z.object({
  amountMinor: field(z.number().int().positive()),
  currency: field(z.string().regex(/^[A-Z]{3}$/)),
  date: field(z.iso.date()),
  merchant: field(z.string().trim().min(1).max(200)),
  category: field(z.string().trim().min(1).max(60)),
});

export type ExtractedFields = z.infer<typeof extractedFieldsSchema>;

export const documentTypes = ["receipt", "dekont"] as const;
export const inputKinds = ["text_pdf", "scanned_pdf", "image"] as const;
export type DocumentType = (typeof documentTypes)[number];
export type InputKind = (typeof inputKinds)[number];

export const extractionResultSchema = z.object({
  fields: extractedFieldsSchema,
  // Tier 0 = code (rules/OCR/memory), 1 = local model, 2-3 = cloud.
  source: z.object({
    provider: z.string().min(1),
    tier: z.number().int().min(0).max(3),
  }),
  document: z.object({
    type: z.enum(documentTypes),
    input: z.enum(inputKinds),
  }),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;
