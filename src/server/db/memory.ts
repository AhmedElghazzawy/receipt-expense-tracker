import { eq, like, sql } from "drizzle-orm";
import { normalizeMerchant } from "@/lib/normalize";
import type { ExtractionResult } from "@/server/extraction/result";
import type { Db } from "./client";
import { categories, extractions, merchants } from "./schema";

export type RememberedCategory = { categoryId: number; categoryName: string; hits: number };

/**
 * Category the user chose for this merchant before. Falls back to the first word
 * so "kahve dunyasi kadikoy" finds "kahve dunyasi" (same chain, other branch).
 */
export function recallMerchantCategory(db: Db, merchant: string): RememberedCategory | undefined {
  const key = normalizeMerchant(merchant);
  if (!key) return undefined;
  const select = () =>
    db
      .select({ categoryId: merchants.categoryId, categoryName: categories.name, hits: merchants.hits })
      .from(merchants)
      .innerJoin(categories, eq(merchants.categoryId, categories.id));

  const exact = select().where(eq(merchants.normalizedName, key)).get();
  if (exact) return exact;
  const firstWord = key.split(" ")[0]!;
  if (firstWord.length < 3) return undefined;
  return select()
    .where(like(merchants.normalizedName, `${firstWord}%`))
    .orderBy(sql`${merchants.hits} desc`)
    .get();
}

/** Called when the user saves an expense: the chosen category wins from now on. */
export function rememberMerchantCategory(db: Db, merchant: string, categoryId: number): void {
  const key = normalizeMerchant(merchant);
  if (!key) return;
  db.insert(merchants)
    .values({ normalizedName: key, categoryId, hits: 1 })
    .onConflictDoUpdate({
      target: merchants.normalizedName,
      set: { categoryId, hits: sql`${merchants.hits} + 1` },
    })
    .run();
}

export function getCachedExtraction(db: Db, fileHash: string) {
  return db.select().from(extractions).where(eq(extractions.fileHash, fileHash)).get();
}

export function cacheExtraction(db: Db, fileHash: string, result: ExtractionResult): void {
  db.insert(extractions)
    .values({ fileHash, resultJson: result, provider: result.source.provider, tier: result.source.tier })
    .onConflictDoUpdate({
      target: extractions.fileHash,
      set: { resultJson: result, provider: result.source.provider, tier: result.source.tier },
    })
    .run();
}
