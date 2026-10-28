/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** WCAG contrast ratio between two #rrggbb colours (1 to 21). */
export function contrastRatio(aHex: string, bHex: string): number {
  return contrast(luminance(aHex), luminance(bHex));
}

/** Black or white, whichever reads better on the given background. */
export function readableTextColor(backgroundHex: string): "#000000" | "#ffffff" {
  if (!/^#[0-9a-f]{6}$/i.test(backgroundHex)) return "#ffffff";
  const bg = luminance(backgroundHex);
  return contrast(bg, 0) >= contrast(bg, 1) ? "#000000" : "#ffffff";
}
