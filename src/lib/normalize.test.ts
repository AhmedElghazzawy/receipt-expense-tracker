import { describe, expect, it } from "vitest";
import { foldText, normalizeMerchant } from "./normalize";

describe("foldText", () => {
  it.each([
    ["İSTANBUL", "istanbul"],
    ["ISPARTA", "isparta"],
    ["ŞOK MARKET", "sok market"],
    ["Kahve Dünyası", "kahve dunyasi"],
    ["ÇİĞDEM ÖĞÜT", "cigdem ogut"],
  ])("%s -> %s", (input, expected) => {
    expect(foldText(input)).toBe(expected);
  });
});

describe("normalizeMerchant", () => {
  it.each([
    ["MİGROS TİC. A.Ş.", "migros"],
    ["Migros", "migros"],
    ["MIGROS", "migros"],
    ["BİM BİRLEŞİK MAĞAZALAR A.Ş. 4321", "bim birlesik magazalar"],
    ["Starbucks Coffee No:12", "starbucks coffee"],
    ["ŞOK MARKETLER TİC. A.Ş.", "sok marketler"],
    ["Kahve Dünyası - Kadıköy Şubesi", "kahve dunyasi kadikoy"],
    ["A101 YENİ MAĞAZACILIK A.Ş.", "a101 yeni"],
    ["  ", ""],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeMerchant(input)).toBe(expected);
  });
});
