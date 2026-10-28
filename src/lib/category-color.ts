/** Stored category colours are palette slots ("cat-1".."cat-8", "cat-other"), themed in globals.css. */
export const categorySlots = ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6", "cat-7", "cat-8"] as const;
export const OTHER_SLOT = "cat-other";

const valid = new Set<string>([...categorySlots, OTHER_SLOT]);

/** Unknown or legacy values (e.g. old hex colours) render as the neutral "other" slot. */
function slot(color: string | null | undefined): string {
  return color && valid.has(color) ? color : OTHER_SLOT;
}

export const categoryFill = (color: string | null | undefined) => `var(--${slot(color)})`;
export const categoryLabel = (color: string | null | undefined) => `var(--${slot(color)}-fg)`;
