import { minorToDecimalString } from "./money";

type Cell = string | number | null | undefined;

/**
 * One RFC 4180 cell. Text starting with = + - @ (or a tab/CR) gets a leading apostrophe so a
 * spreadsheet shows it instead of running it as a formula: merchants and notes may come from OCR.
 */
export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(rows: Cell[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export type ExportRow = {
  date: string;
  amountMinor: number;
  currency: string;
  merchant: string | null;
  categoryName: string | null;
  note: string | null;
  source: string;
};

const HEADER = ["date", "amount", "currency", "merchant", "category", "note", "source"];

/**
 * Expenses as CSV: ISO dates and dot-decimal amounts (exact, from minor units) so any
 * spreadsheet or script reads them the same; a UTF-8 BOM so Excel keeps Turkish letters.
 */
export function expensesCsv(rows: ExportRow[]): string {
  const body = rows.map((r) => [r.date, minorToDecimalString(r.amountMinor), r.currency, r.merchant, r.categoryName, r.note, r.source]);
  return `﻿${toCsv([HEADER, ...body])}`;
}

export function exportFilename(filters: { month?: string }, today: string): string {
  return filters.month ? `expenses-${filters.month}.csv` : `expenses-all-${today}.csv`;
}
