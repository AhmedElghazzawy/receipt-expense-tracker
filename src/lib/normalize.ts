/**
 * Folds Turkish/English text to plain ASCII lowercase for matching:
 * İ/I/ı/i -> i, ş -> s, ğ -> g, ü -> u, ö -> o, ç -> c.
 */
export function foldText(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

// Legal-form and generic words that vary between receipts of the same merchant.
const NOISE_WORDS = new Set([
  "a.s", "as", "anonim", "sirketi", "sti", "ltd", "limited", "tic", "ticaret", "san", "sanayi", "ve",
  "magazacilik", "magazasi", "gida", "pazarlama", "inc", "llc", "gmbh", "co", "the", "subesi", "sube", "store",
]);

/**
 * Stable key for merchant memory: folded, punctuation and branch numbers removed.
 * "MİGROS TİC. A.Ş. 4321 KADIKÖY ŞB." and "Migros" both start with "migros".
 */
export function normalizeMerchant(name: string): string {
  const words = foldText(name)
    .replace(/[^a-z0-9\s.]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/\.+$/, "").replace(/^\.+/, ""))
    .filter((w) => w && !NOISE_WORDS.has(w) && !/^\d+$/.test(w) && !/^(no|nr)\d*$/.test(w));
  return words.join(" ").replace(/\./g, "").trim();
}
