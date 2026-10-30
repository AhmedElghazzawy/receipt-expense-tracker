import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Db, createDb, migrateDb } from "@/server/db/client";
import { seedDefaults } from "@/server/db/seed";
import { MAX_UPLOAD_BYTES } from "./input";
import { handleUpload } from "./upload";

const TODAY = "2026-10-30";
let db: Db;
beforeEach(() => {
  db = createDb(":memory:");
  migrateDb(db);
  seedDefaults(db);
});

const upload = (body: BodyInit, headers?: HeadersInit) =>
  new Request("http://localhost/api/extract", { method: "POST", body, headers });
const withFile = (bytes: Uint8Array<ArrayBuffer>, name = "receipt.pdf") => {
  const form = new FormData();
  form.set("file", new File([bytes], name));
  return upload(form);
};

describe("handleUpload", () => {
  it("extracts a PDF and returns the fields with its hash", async () => {
    const pdf = Uint8Array.from(readFileSync("evals/fixtures/slip-kahve.pdf"));
    const { status, body } = await handleUpload(withFile(pdf), { db, today: TODAY });
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, cached: false, result: { fields: { amountMinor: { value: 8550 } } } });
    expect(body.ok && body.fileHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects files that are not PDFs or images", async () => {
    const { status, body } = await handleUpload(withFile(new TextEncoder().encode("hello"), "a.pdf"), { db, today: TODAY });
    expect(status).toBe(415);
    expect(body).toMatchObject({ ok: false });
  });

  it("rejects missing, empty, and oversized files", async () => {
    expect((await handleUpload(upload(new FormData()), { db, today: TODAY })).status).toBe(400);
    expect((await handleUpload(withFile(new Uint8Array()), { db, today: TODAY })).status).toBe(400);
    expect((await handleUpload(upload("x", { "content-type": "text/plain" }), { db, today: TODAY })).status).toBe(400);
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    expect((await handleUpload(withFile(big), { db, today: TODAY })).status).toBe(413);
  });

  it("refuses a declared oversized body without reading it", async () => {
    const request = upload(new FormData(), { "content-length": String(MAX_UPLOAD_BYTES * 2) });
    const read = vi.spyOn(request, "formData");
    expect((await handleUpload(request, { db, today: TODAY })).status).toBe(413);
    expect(read).not.toHaveBeenCalled();
  });

  it("hides internal errors behind a friendly message", async () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    const pdf = Uint8Array.from(readFileSync("evals/fixtures/slip-kahve.pdf"));
    // A DB that throws on use stands in for any unexpected failure.
    const deps = { db: {} as Db, today: TODAY, pdfText: async () => "TOPLAM 1,00" };
    const { status, body } = await handleUpload(withFile(pdf), deps);
    expect(status).toBe(500);
    expect(body).toEqual({ ok: false, error: "Couldn't read this file. You can enter it by hand." });
    expect(warn).toHaveBeenCalledWith(expect.not.stringContaining("TOPLAM"));
    warn.mockRestore();
  });
});
