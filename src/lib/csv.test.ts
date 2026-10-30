import { describe, expect, it } from "vitest";
import { csvCell, expensesCsv, exportFilename, toCsv } from "./csv";

const row = {
  date: "2026-10-28",
  amountMinor: 123456,
  currency: "TRY",
  merchant: "Migros",
  categoryName: "Groceries",
  note: null,
  source: "receipt",
};

describe("csvCell", () => {
  it("quotes only when needed and doubles inner quotes", () => {
    expect(csvCell("Migros")).toBe("Migros");
    expect(csvCell('Kahve "Dünyası", Moda')).toBe('"Kahve ""Dünyası"", Moda"');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
    expect(csvCell(null)).toBe("");
  });

  it("defuses spreadsheet formulas in text from receipts", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell("+90 555")).toBe("'+90 555");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell("@sum")).toBe("'@sum");
  });
});

describe("toCsv", () => {
  it("joins rows with CRLF (RFC 4180)", () => {
    expect(toCsv([["a", "b"], ["c", null]])).toBe("a,b\r\nc,\r\n");
  });
});

describe("expensesCsv", () => {
  it("starts with a BOM so Excel reads Turkish letters, and writes exact decimal amounts", () => {
    const csv = expensesCsv([row, { ...row, amountMinor: 5, merchant: "İGDAŞ", categoryName: null, note: "Ekim" }]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "date,amount,currency,merchant,category,note,source",
      "2026-10-28,1234.56,TRY,Migros,Groceries,,receipt",
      "2026-10-28,0.05,TRY,İGDAŞ,,Ekim,receipt",
      "",
    ]);
  });

  it("writes just the header for no expenses", () => {
    expect(expensesCsv([])).toBe("﻿date,amount,currency,merchant,category,note,source\r\n");
  });
});

describe("exportFilename", () => {
  it("names the file after the month, or all-time with today's date", () => {
    expect(exportFilename({ month: "2026-10" }, "2026-10-30")).toBe("expenses-2026-10.csv");
    expect(exportFilename({}, "2026-10-30")).toBe("expenses-all-2026-10-30.csv");
  });
});
