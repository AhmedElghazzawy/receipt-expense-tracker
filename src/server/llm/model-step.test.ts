import { beforeEach, describe, expect, it } from "vitest";
import { type Db, createDb, migrateDb } from "@/server/db/client";
import { cloudCallsOn, recordCloudCall } from "@/server/db/usage";
import type { ModelStepInput } from "@/server/extraction/pipeline";
import { MockProvider } from "./mock";
import { createModelStep, type ModelStepDeps } from "./model-step";
import { ProviderError } from "./types";

const TODAY = "2026-10-30";
const sure = (value: string, confidence = 0.95) => ({ value, confidence });
const missing = { value: null, confidence: 0 };

const baseInput: ModelStepInput = {
  text: "MIGROS\nKart No: 4111 1111 1111 1234\nTOPLAM 297,40",
  file: { bytes: new Uint8Array([0x89, 0x50]), mimeType: "image/png" },
  documentType: "receipt",
  inputKind: "image",
  fields: {
    amountMinor: { value: 29740, confidence: 0.9 },
    currency: { value: "TRY", confidence: 0.8 },
    date: missing,
    merchant: { value: "Migros", confidence: 0.9 },
    category: missing,
  },
  uncertain: ["date"],
  ocrConfidence: 0.9,
  categories: ["Groceries", "Dining"],
};

const fullAnswer = { amount: sure("297.40"), date: sure("2026-10-28"), category: sure("Groceries") };

let db: Db;
beforeEach(() => {
  db = createDb(":memory:");
  migrateDb(db);
});

function setup(overrides: Partial<ModelStepDeps> & { localAnswers?: unknown[]; cloudAnswers?: unknown[] } = {}) {
  const local = new MockProvider(overrides.localAnswers ?? [], 1, "local");
  const cloud = new MockProvider(overrides.cloudAnswers ?? [], 2, "cloud");
  const sleeps: number[] = [];
  const step = createModelStep({
    db,
    today: TODAY,
    privacyMode: "smart",
    cloudDailyCap: 500,
    local,
    cloud: [cloud],
    sleep: async (ms) => void sleeps.push(ms),
    ...overrides,
  });
  return { step, local, cloud, sleeps };
}

describe("createModelStep routing", () => {
  it("smart: stays local when tier 1 resolves everything", async () => {
    const { step, local, cloud } = setup({ localAnswers: [fullAnswer] });
    const out = await step(baseInput);
    expect(out).toMatchObject({ provider: "local", tier: 1, fields: { date: sure("2026-10-28"), amountMinor: { value: 29740 } } });
    expect(local.calls[0]!.text).toContain("4111 1111 1111 1234"); // local text is not masked
    expect(local.calls[0]!.file).toBeUndefined();
    expect(cloud.calls).toHaveLength(0);
    expect(cloudCallsOn(db, TODAY)).toBe(0);
  });

  it("smart: falls back to cloud when tier 1 is unsure, masking text and counting the call", async () => {
    const { step, cloud } = setup({ localAnswers: [{ date: sure("2026-10-28", 0.4) }], cloudAnswers: [fullAnswer] });
    const out = await step(baseInput);
    expect(out).toMatchObject({ provider: "cloud", tier: 2 });
    expect(cloud.calls[0]!.text).not.toContain("4111");
    expect(cloud.calls[0]!.text).toContain("1234");
    expect(cloud.calls[0]!.file).toEqual({ mimeType: "image/png", data: baseInput.file.bytes });
    expect(cloudCallsOn(db, TODAY)).toBe(1);
  });

  it("smart: poor OCR goes to cloud even if tier 1 answered", async () => {
    const { step, cloud } = setup({ localAnswers: [fullAnswer], cloudAnswers: [fullAnswer] });
    expect(await step({ ...baseInput, ocrConfidence: 0.5 })).toMatchObject({ tier: 2 });
    expect(cloud.calls).toHaveLength(1);
  });

  it("dekonts never reach the cloud, even in cloud_first", async () => {
    const { step, cloud } = setup({ privacyMode: "cloud_first", localAnswers: [{}] });
    await step({ ...baseInput, documentType: "dekont", ocrConfidence: 0.3 });
    expect(cloud.calls).toHaveLength(0);
  });

  it("local_only never calls the cloud", async () => {
    const { step, cloud } = setup({ privacyMode: "local_only", localAnswers: [{}] });
    await step({ ...baseInput, inputKind: "scanned_pdf", text: "" });
    expect(cloud.calls).toHaveLength(0);
  });

  it("cloud_first: cloud before local; text-layer PDFs keep the file home", async () => {
    const { step, local } = setup({ privacyMode: "cloud_first", cloudAnswers: [fullAnswer] });
    expect(await step(baseInput)).toMatchObject({ tier: 2 });
    expect(local.calls).toHaveLength(0);

    const pdf = setup({ privacyMode: "cloud_first", localAnswers: [{ date: sure("2026-10-28", 0.3) }], cloudAnswers: [fullAnswer] });
    await pdf.step({ ...baseInput, inputKind: "text_pdf", file: { ...baseInput.file, mimeType: "application/pdf" } });
    expect(pdf.local.calls).toHaveLength(1);
    expect(pdf.cloud.calls[0]!.file).toBeUndefined();
  });

  it("scanned PDFs skip tier 1 (no text) and go to cloud with the file", async () => {
    const { step, local, cloud } = setup({ cloudAnswers: [fullAnswer] });
    await step({ ...baseInput, inputKind: "scanned_pdf", text: "", ocrConfidence: null });
    expect(local.calls).toHaveLength(0);
    expect(cloud.calls[0]!.file?.mimeType).toBe("image/png");
  });

  it("stops calling cloud at 80% of the daily cap", async () => {
    for (let i = 0; i < 8; i++) recordCloudCall(db, TODAY);
    const { step, cloud } = setup({ cloudDailyCap: 10, localAnswers: [{}] });
    await step({ ...baseInput, ocrConfidence: 0.3 });
    expect(cloud.calls).toHaveLength(0);
  });
});

describe("createModelStep failures", () => {
  it("on 429: backs off once, retries, and counts both calls", async () => {
    const { step, cloud, sleeps } = setup({
      privacyMode: "cloud_first",
      cloudAnswers: [new ProviderError("rate_limited", "429"), fullAnswer],
    });
    expect(await step(baseInput)).toMatchObject({ tier: 2 });
    expect(cloud.calls).toHaveLength(2);
    expect(sleeps).toEqual([1000]);
    expect(cloudCallsOn(db, TODAY)).toBe(2);
  });

  it("then tier 3, then tier 1 on whatever text exists", async () => {
    const down = () => new ProviderError("unavailable", "503");
    const tier2 = new MockProvider([down(), down()], 2, "tier2");
    const tier3 = new MockProvider([down(), down()], 3, "tier3");
    const { step } = setup({ privacyMode: "cloud_first", localAnswers: [fullAnswer], cloud: [tier2, tier3] });
    expect(await step(baseInput)).toMatchObject({ provider: "local", tier: 1 });
    expect(tier2.calls).toHaveLength(2);
    expect(tier3.calls).toHaveLength(2);
  });

  it("invalid output is not retried and yields null when nothing else works", async () => {
    const { step, cloud } = setup({ privacyMode: "cloud_first", cloudAnswers: ["not json fields"], local: undefined });
    expect(await step(baseInput)).toBeNull();
    expect(cloud.calls).toHaveLength(1);
  });

  it("returns null with no providers or no text", async () => {
    const step = createModelStep({ db, today: TODAY, privacyMode: "smart", cloudDailyCap: 500 });
    expect(await step(baseInput)).toBeNull();
  });
});
