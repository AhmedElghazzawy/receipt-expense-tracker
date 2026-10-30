import { beforeEach, describe, expect, it } from "vitest";
import { type Db, createDb, migrateDb } from "./client";
import { listCategories } from "./expenses";
import { recallMerchantCategory, rememberMerchantCategory } from "./memory";
import { seedDefaults } from "./seed";

let db: Db;
let ids: Record<string, number>;

beforeEach(() => {
  db = createDb(":memory:");
  migrateDb(db);
  seedDefaults(db);
  ids = Object.fromEntries(listCategories(db).map((c) => [c.name, c.id]));
});

describe("merchant memory", () => {
  it("recalls by normalised name regardless of case, suffixes, and Turkish letters", () => {
    rememberMerchantCategory(db, "MİGROS TİC. A.Ş.", ids.Groceries!);
    expect(recallMerchantCategory(db, "Migros")).toMatchObject({ categoryName: "Groceries", hits: 1 });
    expect(recallMerchantCategory(db, "MIGROS")).toMatchObject({ categoryName: "Groceries" });
  });

  it("latest correction wins and hits accumulate", () => {
    rememberMerchantCategory(db, "Starbucks", ids.Dining!);
    rememberMerchantCategory(db, "STARBUCKS", ids.Shopping!);
    expect(recallMerchantCategory(db, "starbucks")).toEqual({
      categoryId: ids.Shopping,
      categoryName: "Shopping",
      hits: 2,
    });
  });

  it("falls back to the same chain at another branch", () => {
    rememberMerchantCategory(db, "Kahve Dünyası Moda", ids.Dining!);
    expect(recallMerchantCategory(db, "KAHVE DÜNYASI KADIKÖY ŞUBESİ")).toMatchObject({ categoryName: "Dining" });
  });

  it("does not guess from very short or empty names", () => {
    rememberMerchantCategory(db, "AB Market", ids.Groceries!);
    expect(recallMerchantCategory(db, "AB Cafe")).toBeUndefined();
    expect(recallMerchantCategory(db, "  ")).toBeUndefined();
  });
});
