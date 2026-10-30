import { describe, expect, it } from "vitest";
import { maskSensitive } from "./mask";

describe("maskSensitive", () => {
  it.each([
    ["IBAN with spaces", "IBAN: TR33 0006 1005 1978 6457 8413 26", "IBAN: [masked …1326]"],
    ["IBAN compact", "Alıcı IBAN TR330006100519786457841326", "Alıcı IBAN [masked …1326]"],
    ["card number", "Kart No: 4543 9600 1234 5678", "Kart No: [masked …5678]"],
    ["card with dashes", "5528-7900-0011-2233", "[masked …2233]"],
    ["partially starred card", "KART 4543 **** **** 5678", "KART [masked …5678]"],
    ["TC identity number", "TCKN 12345678901", "TCKN [masked …8901]"],
    ["account number", "Hesap No 123456789", "Hesap No [masked …6789]"],
  ])("masks %s", (_label, input, expected) => {
    expect(maskSensitive(input)).toBe(expected);
  });

  it.each([
    ["Turkish amount", "TOPLAM *1.234,56"],
    ["large amount", "TUTAR 25.000,00 TL"],
    ["date", "TARİH: 28.10.2026 SAAT: 14:32"],
    ["ISO date", "2026-10-28"],
    ["receipt number", "FİŞ NO: 0042"],
    ["Z number and EKU", "Z NO: 1234 EKÜ NO: 0001"],
    ["phone-like short groups", "Tel: 0212 555 12 34"],
  ])("keeps %s intact", (_label, input) => {
    expect(maskSensitive(input)).toBe(input);
  });

  it("is idempotent", () => {
    const once = maskSensitive("TR33 0006 1005 1978 6457 8413 26 and 4543960012345678");
    expect(maskSensitive(once)).toBe(once);
  });
});
