import { describe, expect, it } from "vitest";
import {
  addDays,
  currentMonth,
  formatDayLabel,
  formatMonth,
  isFutureDate,
  isValidMonth,
  monthRange,
  shiftMonth,
  todayIso,
} from "./dates";

describe("dates", () => {
  it("uses local calendar date, zero-padded", () => {
    const d = new Date(2026, 0, 5, 23, 59);
    expect(todayIso(d)).toBe("2026-01-05");
    expect(currentMonth(d)).toBe("2026-01");
  });

  it.each([
    ["2026-10", 1, "2026-11"],
    ["2026-12", 1, "2027-01"],
    ["2026-01", -1, "2025-12"],
    ["2026-03", -14, "2025-01"],
  ])("shiftMonth(%s, %i) -> %s", (month, delta, expected) => {
    expect(shiftMonth(month, delta)).toBe(expected);
  });

  it("builds half-open month ranges across year end", () => {
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });

  it("validates months", () => {
    expect(isValidMonth("2026-10")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-1")).toBe(false);
  });

  it("adds days across month and leap boundaries", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("detects future dates", () => {
    expect(isFutureDate("2026-10-29", "2026-10-28")).toBe(true);
    expect(isFutureDate("2026-10-28", "2026-10-28")).toBe(false);
  });

  it("labels days relative to today", () => {
    expect(formatDayLabel("2026-10-28", "2026-10-28")).toBe("Today");
    expect(formatDayLabel("2026-10-27", "2026-10-28")).toBe("Yesterday");
    expect(formatDayLabel("2026-03-01", "2026-03-02")).toBe("Yesterday");
    expect(formatDayLabel("2026-10-20", "2026-10-28")).toBe("Tue 20 Oct");
    expect(formatDayLabel("2025-10-20", "2026-10-28")).toBe("Mon, 20 Oct 2025");
  });

  it("formats month names", () => {
    expect(formatMonth("2026-10")).toBe("October 2026");
  });
});
