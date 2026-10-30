// Expense dates are calendar days as ISO "yyyy-mm-dd"; months are "yyyy-mm".

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's calendar date in the machine's local time zone. */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function currentMonth(now = new Date()): string {
  return todayIso(now).slice(0, 7);
}

export function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** Half-open range [start, end) usable for string comparison on ISO dates. */
export function monthRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${shiftMonth(month, 1)}-01` };
}

export function isFutureDate(date: string, today = todayIso()): boolean {
  return date > today;
}

export function formatMonth(month: string, locale = "en-GB"): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    Date.UTC(y, m - 1, 1),
  );
}

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  return new Date(toUtc(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** "Today", "Yesterday", or e.g. "Mon 27 Oct". */
export function formatDayLabel(date: string, today = todayIso(), locale = "en-GB"): string {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.slice(0, 4) !== today.slice(0, 4) && { year: "numeric" }),
    timeZone: "UTC",
  }).format(toUtc(date));
}
