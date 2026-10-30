import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { categoryFill, categoryLabel, categorySlots } from "./category-color";
import { contrastRatio } from "./color";

const css = readFileSync("src/app/globals.css", "utf8");

function tokens(selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  return new Map([...block.matchAll(/--(cat-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]));
}

describe("category colour tokens", () => {
  it.each([":root", '[data-theme="dark"]'])("%s defines every slot with a >= 4.5:1 label colour", (selector) => {
    const t = tokens(selector);
    for (const slot of [...categorySlots, "cat-other"]) {
      const fill = t.get(slot);
      const fg = t.get(`${slot}-fg`);
      expect(fill, slot).toBeDefined();
      expect(contrastRatio(fill!, fg!), slot).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("maps slots to CSS variables and legacy values to other", () => {
    expect(categoryFill("cat-3")).toBe("var(--cat-3)");
    expect(categoryLabel("cat-3")).toBe("var(--cat-3-fg)");
    expect(categoryFill("#117733")).toBe("var(--cat-other)");
    expect(categoryFill(null)).toBe("var(--cat-other)");
  });
});
