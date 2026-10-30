import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

type Item = { str: string; x: number; y: number };

/** A PDF counts as text-layer only if it yields real text (scans often carry a few stray glyphs). */
export const MIN_TEXT_LAYER_CHARS = 20;

/**
 * Reads the PDF text layer (free and exact; most bank dekonts have one).
 * Items are grouped into lines by baseline and ordered left to right.
 */
export async function extractPdfText(bytes: Uint8Array, maxPages = 3): Promise<string> {
  // pdfjs takes ownership of the buffer; pass a copy so callers can reuse theirs.
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let n = 1; n <= Math.min(doc.numPages, maxPages); n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      const items = content.items.flatMap((i) =>
        "str" in i && i.str.trim() !== "" ? [{ str: i.str, x: Number(i.transform[4]), y: Number(i.transform[5]) }] : [],
      );
      pages.push(toLines(items));
    }
    return pages.join("\n");
  } finally {
    await task.destroy();
  }
}

function toLines(items: Item[]): string {
  const lines: { y: number; parts: { x: number; s: string }[] }[] = [];
  for (const { str, x, y } of items) {
    const line = lines.find((l) => Math.abs(l.y - y) <= 2);
    if (line) line.parts.push({ x, s: str });
    else lines.push({ y, parts: [{ x, s: str }] });
  }
  return lines
    .sort((a, b) => b.y - a.y) // PDF y grows upwards
    .map((l) => l.parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(" ").replace(/\s+/g, " ").trim())
    .join("\n");
}
