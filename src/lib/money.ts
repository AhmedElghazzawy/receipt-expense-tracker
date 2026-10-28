export const currencies = ["TRY", "EUR", "USD", "GBP"] as const;
export type Currency = (typeof currencies)[number];
export const DEFAULT_CURRENCY: Currency = "TRY";

const MAX_MINOR = 1_000_000_000_00; // 1 billion major units

/**
 * Parses a user- or OCR-typed amount into integer minor units, without floats.
 * Accepts Turkish (1.234,56) and English (1,234.56) formats and strips currency marks.
 * Returns null for anything ambiguous, negative, or not a number.
 */
export function parseAmount(input: string): number | null {
  const s = input.replace(/\s|₺|€|\$|£|TL|TRY|EUR|USD|GBP/gi, "");
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let decimalSep: "." | "," | null = null;
  let thousandsSep: "." | "," = ".";

  if (lastDot >= 0 && lastComma >= 0) {
    decimalSep = lastDot > lastComma ? "." : ",";
    thousandsSep = decimalSep === "." ? "," : ".";
  } else {
    const sep = lastDot >= 0 ? "." : lastComma >= 0 ? "," : null;
    if (sep) {
      const occurrences = s.split(sep).length - 1;
      const digitsAfter = s.length - s.lastIndexOf(sep) - 1;
      // A single separator followed by 1-2 digits is decimal; exactly 3 is a thousands group.
      if (occurrences === 1 && digitsAfter <= 2) decimalSep = sep;
      else if (digitsAfter === 3) thousandsSep = sep;
      else return null;
    }
  }

  const [wholeRaw, fraction = ""] = decimalSep ? splitOnce(s, decimalSep) : [s];
  if (fraction.length > 2 || /[.,]/.test(fraction)) return null;
  if (!isValidGrouping(wholeRaw, thousandsSep)) return null;

  const whole = wholeRaw.replaceAll(thousandsSep, "");
  const minor = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor <= MAX_MINOR ? minor : null;
}

function splitOnce(s: string, sep: string): [string, string] {
  const i = s.lastIndexOf(sep);
  return [s.slice(0, i), s.slice(i + 1)];
}

function isValidGrouping(whole: string, sep: string): boolean {
  if (/[.,]/.test(whole.replaceAll(sep, ""))) return false;
  if (!whole.includes(sep)) return true;
  return new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`).test(whole);
}

/** Minor units -> exact decimal string ("123456" -> "1234.56"); no float division. */
export function minorToDecimalString(amountMinor: number): string {
  const sign = amountMinor < 0 ? "-" : "";
  const abs = Math.abs(amountMinor).toString().padStart(3, "0");
  return `${sign}${abs.slice(0, -2)}.${abs.slice(-2)}`;
}

export function formatMoney(amountMinor: number, currency: string, locale = "tr-TR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    // Intl accepts exact decimal strings at runtime; the lib types lag behind.
    minorToDecimalString(amountMinor) as unknown as number,
  );
}
