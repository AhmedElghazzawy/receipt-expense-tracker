import { foldText } from "@/lib/normalize";

// Category names must match src/server/db/seed.ts (see the add-category skill).
type CategoryName = "Groceries" | "Dining" | "Transport" | "Bills & Utilities" | "Shopping" | "Health" | "Entertainment" | "Travel";

/** Well-known Turkish and international brands: folded match tokens -> display name and category. */
const brands: { match: string[]; name: string; category: CategoryName }[] = [
  { match: ["migros", "macrocenter"], name: "Migros", category: "Groceries" },
  { match: ["a101"], name: "A101", category: "Groceries" },
  { match: ["bim birlesik", "bim"], name: "BİM", category: "Groceries" },
  { match: ["sok marketler", "sok market"], name: "ŞOK", category: "Groceries" },
  { match: ["carrefoursa", "carrefour"], name: "CarrefourSA", category: "Groceries" },
  { match: ["file market"], name: "File", category: "Groceries" },
  { match: ["starbucks"], name: "Starbucks", category: "Dining" },
  { match: ["kahve dunyasi"], name: "Kahve Dünyası", category: "Dining" },
  { match: ["simit sarayi"], name: "Simit Sarayı", category: "Dining" },
  { match: ["burger king"], name: "Burger King", category: "Dining" },
  { match: ["mcdonald"], name: "McDonald's", category: "Dining" },
  { match: ["yemeksepeti"], name: "Yemeksepeti", category: "Dining" },
  { match: ["getir"], name: "Getir", category: "Groceries" },
  { match: ["shell"], name: "Shell", category: "Transport" },
  { match: ["opet"], name: "Opet", category: "Transport" },
  { match: ["petrol ofisi"], name: "Petrol Ofisi", category: "Transport" },
  { match: ["bitaksi"], name: "BiTaksi", category: "Transport" },
  { match: ["uber"], name: "Uber", category: "Transport" },
  { match: ["istanbulkart", "belbim"], name: "İstanbulkart", category: "Transport" },
  { match: ["igdas"], name: "İGDAŞ", category: "Bills & Utilities" },
  { match: ["enerjisa", "ck bogazici", "bedas"], name: "Enerjisa", category: "Bills & Utilities" },
  { match: ["iski"], name: "İSKİ", category: "Bills & Utilities" },
  { match: ["turkcell"], name: "Turkcell", category: "Bills & Utilities" },
  { match: ["vodafone"], name: "Vodafone", category: "Bills & Utilities" },
  { match: ["turk telekom", "turktelekom"], name: "Türk Telekom", category: "Bills & Utilities" },
  { match: ["trendyol"], name: "Trendyol", category: "Shopping" },
  { match: ["hepsiburada"], name: "Hepsiburada", category: "Shopping" },
  { match: ["amazon"], name: "Amazon", category: "Shopping" },
  { match: ["zara"], name: "Zara", category: "Shopping" },
  { match: ["lc waikiki", "lcw"], name: "LC Waikiki", category: "Shopping" },
  { match: ["ikea"], name: "IKEA", category: "Shopping" },
  { match: ["netflix"], name: "Netflix", category: "Entertainment" },
  { match: ["spotify"], name: "Spotify", category: "Entertainment" },
  { match: ["cinemaximum", "paribu cineverse"], name: "Cinema", category: "Entertainment" },
  { match: ["turk hava yollari", "thy"], name: "Turkish Airlines", category: "Travel" },
  { match: ["pegasus"], name: "Pegasus", category: "Travel" },
  { match: ["airbnb"], name: "Airbnb", category: "Travel" },
];

/** Generic words that hint at a category when no brand matches. */
const hints: { match: string[]; category: CategoryName }[] = [
  { match: ["market", "supermarket", "manav", "kasap", "firin", "grocery"], category: "Groceries" },
  { match: ["restoran", "restaurant", "cafe", "kafe", "kahve", "lokanta", "pastane", "coffee"], category: "Dining" },
  { match: ["akaryakit", "benzin", "motorin", "otopark", "taksi", "taxi", "fuel", "parking"], category: "Transport" },
  { match: ["fatura", "elektrik", "dogalgaz", "aidat", "kira", "internet", "invoice", "rent"], category: "Bills & Utilities" },
  { match: ["eczane", "hastane", "klinik", "pharmacy", "hospital", "saglik"], category: "Health" },
  { match: ["sinema", "tiyatro", "konser", "cinema", "concert"], category: "Entertainment" },
  { match: ["otel", "hotel", "havalimani", "airport", "pansiyon"], category: "Travel" },
];

const hasToken = (folded: string, token: string) => new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`).test(folded);

export function matchBrand(text: string) {
  const folded = foldText(text);
  return brands.find((b) => b.match.some((m) => hasToken(folded, m)));
}

export function matchCategoryHint(text: string): CategoryName | undefined {
  const folded = foldText(text);
  return hints.find((h) => h.match.some((m) => hasToken(folded, m)))?.category;
}
