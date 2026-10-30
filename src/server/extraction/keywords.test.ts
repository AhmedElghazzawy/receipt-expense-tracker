import { describe, expect, it } from "vitest";
import { matchBrand, matchCategoryHint } from "./keywords";

describe("matchBrand", () => {
  it.each([
    ["MİGROS TİCARET A.Ş.", "Migros", "Groceries"],
    ["ŞOK MARKETLER TİC.", "ŞOK", "Groceries"],
    ["KAHVE DÜNYASI MODA", "Kahve Dünyası", "Dining"],
    ["TÜRK HAVA YOLLARI", "Turkish Airlines", "Travel"],
  ])("%s -> %s", (text, name, category) => {
    expect(matchBrand(text)).toMatchObject({ name, category });
  });

  it("matches whole tokens only", () => {
    expect(matchBrand("BIMBO BAKERY")).toBeUndefined();
  });
});

describe("matchCategoryHint", () => {
  it.each([
    ["Açıklama: Ekim kirası", "Bills & Utilities"],
    ["Aidat ödemesi", "Bills & Utilities"],
    ["MODA ECZANESİ", "Health"],
    ["Ayşe'nin Pastanesi", "Dining"],
    ["BiTaksi yolculuk", undefined], // brand list handles BiTaksi; "taksi" is not a word start here
    ["taksi ücreti", "Transport"],
    ["TAKSİT SAYISI: 3", undefined],
    ["E-FATURA NO: GIB2026", undefined],
    ["Parent meeting", undefined],
  ])("%s -> %s", (text, expected) => {
    expect(matchCategoryHint(text)).toBe(expected);
  });
});
