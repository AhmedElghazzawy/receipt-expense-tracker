import { describe, expect, it } from "vitest";
import { listHref, parseListFilters } from "./expense-filters";

const now = new Date(2026, 9, 28);

describe("parseListFilters", () => {
  it("defaults to the current month and no filters", () => {
    expect(parseListFilters({}, now)).toEqual({ month: "2026-10" });
  });

  it("reads valid params", () => {
    expect(parseListFilters({ month: "2026-09", category: "3", q: "  migros " }, now)).toEqual({
      month: "2026-09",
      categoryId: 3,
      search: "migros",
    });
  });

  it("ignores invalid or repeated params safely", () => {
    expect(parseListFilters({ month: "2026-13", category: "-2", q: "   " }, now)).toEqual({ month: "2026-10" });
    expect(parseListFilters({ category: "abc" }, now)).toEqual({ month: "2026-10" });
    expect(parseListFilters({ month: ["2026-08", "2026-07"] }, now).month).toBe("2026-08");
  });

  it("caps search length", () => {
    expect(parseListFilters({ q: "x".repeat(500) }, now).search).toHaveLength(100);
  });
});

describe("listHref", () => {
  const base = { month: "2026-10" };

  it("omits defaults", () => {
    expect(listHref(base, {}, now)).toBe("/expenses");
  });

  it("applies changes and encodes search", () => {
    expect(listHref(base, { month: "2026-09", categoryId: 2, search: "kahve & çay" }, now)).toBe(
      "/expenses?month=2026-09&category=2&q=kahve+%26+%C3%A7ay",
    );
  });

  it("clears a filter when set to undefined", () => {
    expect(listHref({ ...base, categoryId: 2 }, { categoryId: undefined }, now)).toBe("/expenses");
  });
});
