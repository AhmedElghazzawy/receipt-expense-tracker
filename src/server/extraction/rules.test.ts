import { describe, expect, it } from "vitest";
import { detectDocumentType, extractWithRules } from "./rules";

const TODAY = "2026-10-30";

const migrosReceipt = `
MİGROS TİCARET A.Ş.
KADIKÖY MAH. BAHARİYE CAD. NO:12
KADIKÖY / İSTANBUL
V.D. BÜYÜK MÜKELLEFLER 6220529513
TARİH: 28.10.2026      SAAT: 18:42
FİŞ NO: 0042
SÜT 1L                 %1   *32,50
EKMEK                  %1   *15,00
DETERJAN               %20 *249,90
TOPKDV                      *42,57
TOPLAM                     *297,40
NAKİT                      *300,00
PARA ÜSTÜ                    *2,60
`;

const englishReceipt = `
Corner Cafe
12 High Street, London
Date: 14/10/2026
Flat white          3.40
Croissant           2.90
Subtotal            6.30
VAT 20%             1.05
Total               £6.30
Card                6.30
`;

const eftDekont = `
XYZ BANKASI A.Ş.
EFT DEKONTU
İşlem Tarihi: 27.10.2026 10:15
Gönderen: AHMET YILMAZ
Gönderen IBAN: TR33 0006 1005 1978 6457 8413 26
Alıcı Adı: ÖRNEK EMLAK LTD. ŞTİ.
Alıcı IBAN: TR12 0001 0012 3456 7890 1234 56
Açıklama: Ekim kirası
İşlem Tutarı: 25.000,00 TL
Masraf: 0,00 TL
`;

const cardSlip = `
İŞYERİ ADI: KAHVE DÜNYASI MODA
İŞYERİ NO: 000123456
TARİH 26/10/26 SAAT 09:12
SATIŞ
KART NO: 4543 **** **** 5678
SATIŞ TUTARI
85,50 TL
`;

describe("extractWithRules", () => {
  it("reads a Turkish market receipt and ignores tax, cash, and change", () => {
    const { fields, documentType } = extractWithRules(migrosReceipt, TODAY);
    expect(documentType).toBe("receipt");
    expect(fields.amountMinor).toMatchObject({ value: 29740 });
    expect(fields.amountMinor.confidence).toBeGreaterThanOrEqual(0.85);
    expect(fields.currency.value).toBe("TRY");
    expect(fields.date).toMatchObject({ value: "2026-10-28" });
    expect(fields.merchant).toMatchObject({ value: "Migros", confidence: 0.85 });
    expect(fields.category.value).toBe("Groceries");
  });

  it("reads an English receipt, skipping subtotal and VAT", () => {
    const { fields } = extractWithRules(englishReceipt, TODAY);
    expect(fields.amountMinor.value).toBe(630);
    expect(fields.amountMinor.confidence).toBeGreaterThan(0.9); // total agrees with card line
    expect(fields.currency).toMatchObject({ value: "GBP", confidence: 0.92 });
    expect(fields.date.value).toBe("2026-10-14");
    expect(fields.merchant.value).toBe("Corner Cafe");
    expect(fields.category.value).toBe("Dining");
  });

  it("reads an EFT dekont: amount, payee, and date", () => {
    const { fields, documentType } = extractWithRules(eftDekont, TODAY);
    expect(documentType).toBe("dekont");
    expect(fields.amountMinor).toMatchObject({ value: 2500000 });
    expect(fields.currency.value).toBe("TRY");
    expect(fields.date).toMatchObject({ value: "2026-10-27", confidence: 0.9 });
    expect(fields.merchant).toMatchObject({ value: "ÖRNEK EMLAK LTD. ŞTİ.", confidence: 0.7 });
  });

  it("reads a card slip with the amount on the line after its label", () => {
    const { fields } = extractWithRules(cardSlip, TODAY);
    expect(fields.amountMinor.value).toBe(8550);
    expect(fields.date.value).toBe("2026-10-26");
    expect(fields.merchant).toMatchObject({ value: "Kahve Dünyası" });
    expect(fields.category.value).toBe("Dining");
  });

  it("does not mistake OCR-garbled KDV rates ($1 for %1) for dollars", () => {
    // Verbatim tesseract output for evals/fixtures/receipt-migros.png.
    const ocr = "MİGROS TİCARET A.Ş.\nSÜT 1L $1 *32,50\nEKMEK $1 *15,00\nDETERJAN %20 *249,90\nTOPKDV *42,57\nTOPLAM *297,40";
    const { fields } = extractWithRules(ocr, TODAY);
    expect(fields.currency).toEqual({ value: "TRY", confidence: 0.8 });
    expect(fields.amountMinor.value).toBe(29740);
  });

  it("still detects symbols written next to amounts", () => {
    expect(extractWithRules("Total $12.50", TODAY).fields.currency.value).toBe("USD");
    expect(extractWithRules("Summe 8,90 €", TODAY).fields.currency.value).toBe("EUR");
  });

  it("falls back to the largest amount with low confidence when no keyword exists", () => {
    const { fields } = extractWithRules("ABC LTD\n12,00\n140,50\n3,25", TODAY);
    expect(fields.amountMinor).toEqual({ value: 14050, confidence: 0.4 });
  });

  it("ignores future and impossible dates", () => {
    expect(extractWithRules("TOPLAM 10,00\nTARİH 31.12.2026", TODAY).fields.date.value).toBeNull();
    expect(extractWithRules("TOPLAM 10,00\n31.02.2026", TODAY).fields.date.value).toBeNull();
    expect(extractWithRules("TOPLAM 10,00\n2026-10-01", TODAY).fields.date.value).toBe("2026-10-01");
  });

  it("returns nulls with zero confidence for empty text", () => {
    const { fields } = extractWithRules("", TODAY);
    expect(fields.amountMinor).toEqual({ value: null, confidence: 0 });
    expect(fields.merchant).toEqual({ value: null, confidence: 0 });
    expect(fields.currency).toEqual({ value: "TRY", confidence: 0.5 });
  });
});

describe("detectDocumentType", () => {
  it.each([
    ["havale dekontu", "dekont"],
    ["alici iban tr12", "dekont"],
    ["toplam 10,00 kdv", "receipt"],
    ["fast odeme", "receipt"],
  ])("%s -> %s", (text, expected) => {
    expect(detectDocumentType(text)).toBe(expected);
  });
});
