import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Db, createDb, migrateDb } from "@/server/db/client";
import { listCategories } from "@/server/db/expenses";
import { getCachedExtraction, rememberMerchantCategory } from "@/server/db/memory";
import { seedDefaults } from "@/server/db/seed";
import { terminateOcr } from "./ocr";
import { extractDocument, type ModelStep, UnsupportedFileError } from "./pipeline";

const TODAY = "2026-10-30";
const fixture = (name: string) => new Uint8Array(readFileSync(`evals/fixtures/${name}`));
const png = fixture("receipt-migros.png");
const dekont = fixture("dekont-eft.pdf");
const slip = fixture("slip-kahve.pdf");

let db: Db;
beforeEach(() => {
  db = createDb(":memory:");
  migrateDb(db);
  seedDefaults(db);
});
afterAll(terminateOcr);

describe("extractDocument with real PDF text and OCR", () => {
  it("reads a receipt photo with OCR and rules alone", async () => {
    const modelStep = vi.fn<ModelStep>();
    const { result, cached } = await extractDocument(png, { db, today: TODAY, modelStep });
    expect(cached).toBe(false);
    expect(result.fields).toMatchObject({
      amountMinor: { value: 29740 },
      currency: { value: "TRY" },
      date: { value: "2026-10-28" },
      merchant: { value: "Migros" },
      category: { value: "Groceries" },
    });
    expect(result.source).toEqual({ provider: "rules", tier: 0 });
    expect(result.document).toEqual({ type: "receipt", input: "image" });
    expect(modelStep).not.toHaveBeenCalled();
  }, 30_000);

  it("reads a text-layer dekont with rules alone, category from its description", async () => {
    const modelStep = vi.fn<ModelStep>();
    const { result } = await extractDocument(dekont, { db, today: TODAY, modelStep });
    expect(result.fields).toMatchObject({
      amountMinor: { value: 2500000 },
      date: { value: "2026-10-27" },
      merchant: { value: "ÖRNEK EMLAK LTD. ŞTİ." },
      category: { value: "Bills & Utilities" },
    });
    expect(result.document).toEqual({ type: "dekont", input: "text_pdf" });
    expect(result.source).toEqual({ provider: "rules", tier: 0 });
    expect(modelStep).not.toHaveBeenCalled();
  });

  it("reads a card slip PDF", async () => {
    const { result } = await extractDocument(slip, { db, today: TODAY });
    expect(result.fields).toMatchObject({ amountMinor: { value: 8550 }, merchant: { value: "Kahve Dünyası" } });
  });
});

describe("extractDocument steps", () => {
  const ocr = (text: string, confidence = 0.95) => vi.fn().mockResolvedValue({ text, confidence });
  const receiptText = "MİGROS TİCARET A.Ş.\nTARİH: 28.10.2026\nTOPLAM *297,40";

  it("asks a model only for what rules could not find", async () => {
    const modelStep = vi.fn<ModelStep>().mockResolvedValue({
      fields: { category: { value: "Shopping", confidence: 0.8 } },
      provider: "mock",
      tier: 1,
    });
    const text = "EFT DEKONTU\nİşlem Tarihi: 27.10.2026\nAlıcı Adı: ÖRNEK LTD\nİşlem Tutarı: 450,00 TL";
    const { result } = await extractDocument(dekont, { db, today: TODAY, pdfText: async () => text, modelStep });
    const input = modelStep.mock.calls[0]![0];
    expect(input.documentType).toBe("dekont");
    expect(input.uncertain).toEqual([]);
    expect(input.categories).toContain("Groceries");
    expect(result.fields.category).toEqual({ value: "Shopping", confidence: 0.8 });
    expect(result.fields.amountMinor.value).toBe(45000);
    expect(result.source).toEqual({ provider: "mock", tier: 1 });
  });

  it("returns the cached result for a file it has seen", async () => {
    const first = ocr(receiptText);
    await extractDocument(png, { db, today: TODAY, ocr: first });
    const second = ocr(receiptText);
    const { cached, result } = await extractDocument(png, { db, today: TODAY, ocr: second });
    expect(cached).toBe(true);
    expect(second).not.toHaveBeenCalled();
    expect(result.fields.amountMinor.value).toBe(29740);
  });

  it("applies the latest merchant memory to cached results too", async () => {
    await extractDocument(png, { db, today: TODAY, ocr: ocr(receiptText) });
    const dining = listCategories(db).find((c) => c.name === "Dining")!;
    rememberMerchantCategory(db, "Migros", dining.id);
    const { cached, result } = await extractDocument(png, { db, today: TODAY, ocr: ocr(receiptText) });
    expect(cached).toBe(true);
    expect(result.fields.category).toEqual({ value: "Dining", confidence: 0.95 });
  });

  it("uses merchant memory over keyword guesses", async () => {
    const dining = listCategories(db).find((c) => c.name === "Dining")!;
    rememberMerchantCategory(db, "MIGROS", dining.id);
    const { result } = await extractDocument(png, { db, today: TODAY, ocr: ocr(receiptText) });
    expect(result.fields.category).toEqual({ value: "Dining", confidence: 0.95 });
  });

  it("caps confidence by poor OCR and lets a model fill in", async () => {
    const modelStep = vi.fn<ModelStep>().mockResolvedValue({
      fields: { amountMinor: { value: 29740, confidence: 0.9 }, merchant: { value: "Migros", confidence: 0.9 } },
      provider: "gemini",
      tier: 2,
    });
    const { result } = await extractDocument(png, { db, today: TODAY, ocr: ocr("M1GR0S\nT0PLAM 297,4O", 0.4), modelStep });
    expect(modelStep.mock.calls[0]![0].ocrConfidence).toBe(0.4);
    expect(result.fields.amountMinor).toEqual({ value: 29740, confidence: 0.9 });
    expect(result.source).toEqual({ provider: "gemini", tier: 2 });
  });

  it("ignores invalid model output and drops future dates", async () => {
    const bad = vi.fn<ModelStep>().mockResolvedValue({
      fields: { amountMinor: { value: 12.5, confidence: 1 } } as never,
      provider: "mock",
      tier: 1,
    });
    const r1 = await extractDocument(png, { db, today: TODAY, ocr: ocr("TOPLAM 10,00"), modelStep: bad });
    expect(r1.result.fields.amountMinor.value).toBe(1000);

    const future = vi.fn<ModelStep>().mockResolvedValue({
      fields: { date: { value: "2027-01-01", confidence: 0.99 } },
      provider: "mock",
      tier: 1,
    });
    const r2 = await extractDocument(slip, { db, today: TODAY, pdfText: async () => "TOPLAM 10,00", modelStep: future });
    expect(r2.result.fields.date.value).toBeNull();
  });

  it("does not cache when a needed model was unavailable", async () => {
    const { fileHash } = await extractDocument(png, {
      db,
      today: TODAY,
      ocr: ocr("blurry", 0.2),
      modelStep: async () => null,
    });
    expect(getCachedExtraction(db, fileHash)).toBeUndefined();
  });

  it("does not cache when reading the text failed, and says why in the log", async () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = vi.fn().mockRejectedValue(new Error("worker crashed"));
    const { fileHash, result } = await extractDocument(png, { db, today: TODAY, ocr: broken });
    expect(result.fields.amountMinor.value).toBeNull();
    expect(getCachedExtraction(db, fileHash)).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("worker crashed"));
    warn.mockRestore();
  });

  it("treats a PDF without a text layer as scanned and hands the file to the model", async () => {
    const modelStep = vi.fn<ModelStep>().mockResolvedValue(null);
    const { result } = await extractDocument(dekont, { db, today: TODAY, pdfText: async () => "  ", modelStep });
    expect(result.document.input).toBe("scanned_pdf");
    expect(modelStep.mock.calls[0]![0].file.mimeType).toBe("application/pdf");
  });

  it("rejects files that are not PDF or images", async () => {
    await expect(extractDocument(new TextEncoder().encode("hello"), { db, today: TODAY })).rejects.toBeInstanceOf(
      UnsupportedFileError,
    );
  });
});
