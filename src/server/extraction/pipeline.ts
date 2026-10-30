import { isFutureDate } from "@/lib/dates";
import type { Db } from "@/server/db/client";
import { listCategories } from "@/server/db/expenses";
import { cacheExtraction, getCachedExtraction, recallMerchantCategory } from "@/server/db/memory";
import { type FileType, sha256, sniffFileType } from "./input";
import { mergeFields, uncertainFields } from "./merge";
import { type OcrResult, ocrImage } from "./ocr";
import { extractPdfText, MIN_TEXT_LAYER_CHARS } from "./pdf-text";
import {
  type DocumentType,
  type ExtractedFields,
  type ExtractionResult,
  extractedFieldsSchema,
  extractionResultSchema,
  type InputKind,
  LOW_CONFIDENCE,
} from "./result";
import { extractWithRules } from "./rules";

/** OCR below this is treated as unreliable text (docs/MODEL_ROUTING.md rule 3). */
export const GOOD_OCR_CONFIDENCE = 0.75;

export type ModelStepInput = {
  /** Unmasked document text; the step masks it before anything leaves the machine. */
  text: string;
  file: { bytes: Uint8Array; mimeType: FileType["mimeType"] };
  documentType: DocumentType;
  inputKind: InputKind;
  fields: ExtractedFields;
  uncertain: (keyof ExtractedFields)[];
  ocrConfidence: number | null;
  categories: string[];
};

export type ModelStepOutput = { fields: Partial<ExtractedFields>; provider: string; tier: 1 | 2 | 3 };

/** Tiers 1-3 (local/cloud models). Returns null when no model may or could run. */
export type ModelStep = (input: ModelStepInput) => Promise<ModelStepOutput | null>;

export type PipelineDeps = {
  db: Db;
  today: string;
  modelStep?: ModelStep;
  ocr?: (bytes: Uint8Array) => Promise<OcrResult>;
  pdfText?: (bytes: Uint8Array) => Promise<string>;
};

export type PipelineOutput = { result: ExtractionResult; fileHash: string; cached: boolean };

export class UnsupportedFileError extends Error {
  constructor() {
    super("Unsupported file. Upload a PDF, JPEG, PNG, or WebP.");
    this.name = "UnsupportedFileError";
  }
}

/**
 * Cheapest step that works wins: cache, text layer or OCR, rules, merchant memory,
 * then a model only for what is still uncertain. Never saves an expense.
 */
export async function extractDocument(bytes: Uint8Array, deps: PipelineDeps): Promise<PipelineOutput> {
  const fileType = sniffFileType(bytes);
  if (!fileType) throw new UnsupportedFileError();

  const fileHash = sha256(bytes);
  const cached = getCachedExtraction(deps.db, fileHash);
  if (cached) {
    const parsed = extractionResultSchema.safeParse(cached.resultJson);
    if (parsed.success) return { result: parsed.data, fileHash, cached: true };
  }

  // 1. Text: PDF text layer (exact) or OCR.
  let text = "";
  let inputKind: InputKind;
  let ocrConfidence: number | null = null;
  if (fileType.kind === "pdf") {
    text = await (deps.pdfText ?? extractPdfText)(bytes).catch(() => "");
    inputKind = text.replace(/\s/g, "").length >= MIN_TEXT_LAYER_CHARS ? "text_pdf" : "scanned_pdf";
    // Scanned PDFs have no local renderer yet; only a cloud model can read them.
    if (inputKind === "scanned_pdf") text = "";
  } else {
    inputKind = "image";
    const ocr = await (deps.ocr ?? ocrImage)(bytes).catch(() => ({ text: "", confidence: 0 }));
    text = ocr.text;
    ocrConfidence = ocr.confidence;
  }

  // 2. Rules. OCR doubts carry over: a field read from shaky OCR can't be more certain than the OCR.
  const rules = extractWithRules(text, deps.today);
  let fields = rules.fields;
  if (ocrConfidence !== null && ocrConfidence < GOOD_OCR_CONFIDENCE) fields = capConfidence(fields, ocrConfidence);
  let source: ExtractionResult["source"] = { provider: "rules", tier: 0 };

  // 3. Merchant memory: the user's own past choice beats keyword guesses.
  if (fields.merchant.value) {
    const remembered = recallMerchantCategory(deps.db, fields.merchant.value);
    if (remembered) fields = { ...fields, category: { value: remembered.categoryName, confidence: 0.95 } };
  }

  // 4. Models, only for what is still uncertain.
  const uncertain = uncertainFields(fields, LOW_CONFIDENCE);
  const needsModel = uncertain.length > 0 || inputKind === "scanned_pdf" || fields.category.value === null;
  let modelUnavailable = false;
  if (needsModel && deps.modelStep) {
    const out = await deps.modelStep({
      text,
      file: { bytes, mimeType: fileType.mimeType },
      documentType: rules.documentType,
      inputKind,
      fields,
      uncertain,
      ocrConfidence,
      categories: listCategories(deps.db).map((c) => c.name),
    }).catch(() => null);
    // Model output is untrusted: anything that doesn't parse is ignored.
    const parsed = out ? extractedFieldsSchema.partial().safeParse(out.fields) : undefined;
    if (out && parsed?.success) {
      const merged = mergeFields(fields, sanitize(parsed.data, deps.today));
      fields = merged.fields;
      if (merged.changed.length) source = { provider: out.provider, tier: out.tier };
    } else {
      modelUnavailable = true;
    }
  }

  const result = extractionResultSchema.parse({
    fields: sanitize(fields, deps.today) as ExtractedFields,
    source,
    document: { type: rules.documentType, input: inputKind },
  });
  // Don't cache a degraded result: retrying later (e.g. once Ollama runs) may do better.
  if (!modelUnavailable) cacheExtraction(deps.db, fileHash, result);
  return { result, fileHash, cached: false };
}

function capConfidence(fields: ExtractedFields, cap: number): ExtractedFields {
  const out = { ...fields };
  for (const key of Object.keys(out) as (keyof ExtractedFields)[]) {
    out[key] = { ...out[key], confidence: Math.min(out[key].confidence, cap) } as never;
  }
  return out;
}

/** Sanity checks on any step's output: drop future dates (docs/ARCHITECTURE.md step 8). */
function sanitize<T extends Partial<ExtractedFields>>(fields: T, today: string): T {
  if (fields.date?.value && isFutureDate(fields.date.value, today)) {
    return { ...fields, date: { value: null, confidence: 0 } };
  }
  return fields;
}
