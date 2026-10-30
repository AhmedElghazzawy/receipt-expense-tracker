/**
 * Masks sensitive digits before any text leaves the machine (docs/ARCHITECTURE.md).
 * Keeps the last 4 digits for recognisability. Amounts and dates are untouched:
 * they are short digit groups split by separators.
 */

const keepLast4 = (match: string) => {
  const digits = match.replace(/\D/g, "");
  return `[masked …${digits.slice(-4)}]`;
};

const patterns: RegExp[] = [
  // IBAN: 2 letters, 2 check digits, 11-30 alphanumerics, optionally grouped by spaces.
  /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/gi,
  // Card numbers: 13-19 digits with optional space/dash grouping, incl. partially starred PANs.
  /\b(?:\d[ -]?){12,18}\d\b/g,
  /\b\d{4}[ -]?[*xX•]{2,4}[ -]?[*xX•]{4}[ -]?\d{4}\b/g,
  // Any other long digit run (TCKN, account and customer numbers).
  /\b\d{9,}\b/g,
];

export function maskSensitive(text: string): string {
  return patterns.reduce((acc, re) => acc.replace(re, keepLast4), text);
}
