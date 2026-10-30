import { isFutureDate } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import { foldText } from "@/lib/normalize";
import type { ExtractedFields } from "./result";
import { matchBrand, matchCategoryHint } from "./keywords";

export type DocumentType = "receipt" | "dekont";

export type RuleResult = { fields: ExtractedFields; documentType: DocumentType };

const field = <T>(value: T | null, confidence: number) => ({ value, confidence: value === null ? 0 : confidence });

/** Tier 0: regexes and keywords over document text. Pure; never calls a model. */
export function extractWithRules(text: string, today: string): RuleResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const folded = lines.map(foldText);
  const documentType = detectDocumentType(folded.join("\n"));

  const amount = findTotal(lines, folded);
  const brand = matchBrand(lines.slice(0, 8).join("\n")) ?? matchBrand(text);
  const merchant = brand ? { name: brand.name, confidence: 0.85 } : findMerchant(lines, folded, documentType);
  const category = brand?.category ?? (merchant ? matchCategoryHint(merchant.name) : undefined) ?? matchCategoryHint(text);

  return {
    documentType,
    fields: {
      amountMinor: field(amount?.minor ?? null, amount?.confidence ?? 0),
      currency: findCurrency(folded, amount?.line),
      date: findDate(lines, folded, today),
      merchant: field(merchant?.name ?? null, merchant?.confidence ?? 0),
      category: field(category ?? null, brand ? 0.8 : 0.55),
    },
  };
}

export function detectDocumentType(foldedText: string): DocumentType {
  const dekontWords = ["dekont", "havale", "eft", "fast", "alici", "gonderen", "hesap hareket", "iban"];
  // Prefix match: Turkish attaches suffixes ("dekontu", "havalesi", "alıcı adı").
  const hits = dekontWords.filter((w) => new RegExp(`\\b${w}`).test(foldedText)).length;
  return /\bdekont/.test(foldedText) || hits >= 2 ? "dekont" : "receipt";
}

// --- amount ---------------------------------------------------------------

// Money with exactly two decimals ("1.234,56", "*45,00", "1,234.56", "12.50"); Turkish receipts prefix with *.
const MONEY = /\*?\b\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b|\*?\b\d+[.,]\d{2}\b/g;

const totalKeywords: [RegExp, number][] = [
  [/\bgenel toplam\b|\bgrand total\b/, 0.95],
  [/\bodenecek (tutar|toplam)\b|\bamount due\b|\btotal due\b/, 0.92],
  [/\b(islem|satis|harcama|odeme|transfer|havale|eft) tutari\b/, 0.9],
  [/\btoplam\b|\btotal\b/, 0.88],
  [/\btutar\b|\bamount\b/, 0.75],
  [/\b(kredi karti|banka karti|kart|card|visa|mastercard)\b/, 0.6],
];
// Lines whose amounts are never the total: tax, subtotal, cash tendered, change, balances.
const excluded =
  /\b(top ?kdv|kdv|vat|tax|ara toplam|sub ?total|nakit|cash|para ustu|change|bakiye|balance|limit|indirim|discount|puan)\b/;

function amountsIn(line: string): number[] {
  return [...line.matchAll(MONEY)].map((m) => parseAmount(m[0].replace("*", ""))).filter((v): v is number => !!v);
}

function findTotal(lines: string[], folded: string[]) {
  let best: { minor: number; confidence: number; line: number } | undefined;
  const consider = (minor: number, confidence: number, line: number) => {
    // Later lines win ties: totals sit at the bottom.
    if (!best || confidence > best.confidence || (confidence === best.confidence && line >= best.line)) {
      best = { minor, confidence, line };
    }
  };

  folded.forEach((f, i) => {
    if (excluded.test(f)) return;
    const score = totalKeywords.find(([re]) => re.test(f))?.[1];
    if (!score) return;
    const here = amountsIn(lines[i]!);
    // Keyword with the amount on the next line, as on narrow thermal receipts.
    const amounts = here.length ? here : i + 1 < lines.length && !excluded.test(folded[i + 1]!) ? amountsIn(lines[i + 1]!) : [];
    const amount = amounts.at(-1);
    if (amount) consider(amount, score, here.length ? i : i + 1);
  });

  // Agreement between the total and the card/payment line raises confidence.
  if (best && best.confidence < 0.95) {
    const agreeing = folded.filter((f, i) => !excluded.test(f) && amountsIn(lines[i]!).includes(best!.minor)).length;
    if (agreeing >= 2) best.confidence = Math.min(0.97, best.confidence + 0.07);
  }
  if (best) return best;

  // No keyword: the largest plausible amount, flagged as unsure.
  const all = folded.flatMap((f, i) => (excluded.test(f) ? [] : amountsIn(lines[i]!).map((minor) => ({ minor, line: i }))));
  const largest = all.sort((a, b) => b.minor - a.minor)[0];
  return largest ? { ...largest, confidence: 0.4 } : undefined;
}

// --- currency -------------------------------------------------------------

const currencyMarkers: [string, RegExp][] = [
  ["TRY", /₺|\btl\b|\btry\b|\blira\b/],
  ["EUR", /€|\beur\b|\beuro\b/],
  ["USD", /\$|\busd\b/],
  ["GBP", /£|\bgbp\b/],
];

function findCurrency(folded: string[], amountLine?: number) {
  const onLine = amountLine === undefined ? undefined : currencyMarkers.find(([, re]) => re.test(folded[amountLine]!));
  if (onLine) return field(onLine[0], 0.92);
  const counts = currencyMarkers
    .map(([code, re]) => [code, folded.filter((f) => re.test(f)).length] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (counts[0]) return field(counts[0][0], 0.75);
  return field("TRY", 0.5); // Turkish documents by default (docs/PLAN.md)
}

// --- date -----------------------------------------------------------------

const DATE = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b|\b(\d{4})-(\d{2})-(\d{2})\b/g;

function toIso(m: RegExpMatchArray): string | null {
  const [y, mo, d] = m[4] ? [Number(m[4]), Number(m[5]), Number(m[6])] : [Number(m[3]), Number(m[2]), Number(m[1])];
  const year = y < 100 ? 2000 + y : y;
  if (year < 2000 || mo < 1 || mo > 12 || d < 1) return null;
  if (d > new Date(Date.UTC(year, mo, 0)).getUTCDate()) return null;
  return `${year}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function findDate(lines: string[], folded: string[], today: string) {
  const found: { iso: string; labelled: boolean }[] = [];
  lines.forEach((line, i) => {
    const labelled = /\b(islem )?tarih(i)?\b|\bdate\b/.test(folded[i]!);
    for (const m of line.matchAll(DATE)) {
      const iso = toIso(m);
      if (iso && !isFutureDate(iso, today)) found.push({ iso, labelled });
    }
  });
  if (found.length === 0) return field<string>(null, 0);
  const distinct = new Set(found.map((f) => f.iso));
  const labelled = found.find((f) => f.labelled);
  if (distinct.size === 1) return field(found[0]!.iso, 0.9);
  return labelled ? field(labelled.iso, 0.8) : field(found[0]!.iso, 0.55);
}

// --- merchant -------------------------------------------------------------

// Non-global copies: .test() on a /g regex carries lastIndex between calls.
const hasDate = new RegExp(DATE.source);
const hasMoney = new RegExp(MONEY.source);

const notMerchant =
  /\b(fis|fatura|tarih|saat|toplam|kdv|nakit|kart|vergi|v\.?d|vkn|tckn|mersis|tel|telefon|adres|mah|cad|sok|sk|no:|blv|bulvari|ettn|z no|eku|dekont|sayin|musteri|www|http)\b|@/;

function cleanName(name: string): string {
  return name.replace(/\s*[-|:]+\s*$/, "").trim().slice(0, 80);
}

function findMerchant(lines: string[], folded: string[], type: DocumentType) {
  // Dekonts and card slips label the counterparty explicitly.
  const labels = type === "dekont" ? /^(alici( adi)?( unvani)?|isyeri( adi)?|aciklama)\s*:?\s*(.+)$/ : /^(isyeri( adi)?|merchant)\s*:?\s*(.+)$/;
  for (let i = 0; i < folded.length; i++) {
    const m = folded[i]!.match(labels);
    if (m) {
      const value = lines[i]!.slice(lines[i]!.length - m.at(-1)!.length);
      if (/[a-z]{3}/i.test(m.at(-1)!)) return { name: cleanName(value), confidence: 0.7 };
    }
  }
  if (type === "dekont") return undefined;

  // Receipts print the business name in the first lines, before address and tax office.
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const f = folded[i]!;
    if (notMerchant.test(f) || hasDate.test(f) || hasMoney.test(f)) continue;
    if ((f.match(/[a-z]/g) ?? []).length >= 3) return { name: cleanName(lines[i]!), confidence: 0.5 };
  }
  return undefined;
}
