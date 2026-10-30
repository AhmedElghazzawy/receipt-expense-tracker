// `pnpm eval`: field accuracy and latency on the golden set (docs/MODEL_ROUTING.md).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeMerchant } from "../src/lib/normalize";
import { createDb, migrateDb } from "../src/server/db/client";
import { seedDefaults } from "../src/server/db/seed";
import { terminateOcr } from "../src/server/extraction/ocr";
import { extractDocument, type ModelStep } from "../src/server/extraction/pipeline";

type Expected = { amountMinor: number; currency: string; date: string; merchant: string; category: string; documentType: string };
type Case = { file: string; today: string; expected: Expected };

const here = dirname(fileURLToPath(import.meta.url));
const cases: Case[] = JSON.parse(readFileSync(join(here, "cases.json"), "utf8"));
const fields = ["amountMinor", "currency", "date", "merchant", "category", "documentType"] as const;

export async function runEval(modelStep?: ModelStep, label = "rules only") {
  const correct = Object.fromEntries(fields.map((f) => [f, 0])) as Record<(typeof fields)[number], number>;
  const rows: string[] = [];
  let totalMs = 0;

  for (const c of cases) {
    const db = createDb(":memory:"); // fresh DB: no cache or memory carry-over between cases
    migrateDb(db);
    seedDefaults(db);
    const t0 = performance.now();
    const { result } = await extractDocument(new Uint8Array(readFileSync(join(here, c.file))), { db, today: c.today, modelStep });
    const ms = performance.now() - t0;
    totalMs += ms;

    const got = {
      amountMinor: result.fields.amountMinor.value,
      currency: result.fields.currency.value,
      date: result.fields.date.value,
      merchant: result.fields.merchant.value,
      category: result.fields.category.value,
      documentType: result.document.type,
    };
    const misses: string[] = [];
    for (const f of fields) {
      const ok =
        f === "merchant"
          ? normalizeMerchant(String(got.merchant ?? "")).startsWith(normalizeMerchant(c.expected.merchant))
          : got[f] === c.expected[f];
      if (ok) correct[f]++;
      else misses.push(`${f}: got ${JSON.stringify(got[f])}, want ${JSON.stringify(c.expected[f])}`);
    }
    rows.push(`${misses.length ? "✗" : "✓"} ${c.file.padEnd(28)} ${ms.toFixed(0).padStart(5)} ms  tier ${result.source.tier} ${result.source.provider}${misses.map((m) => `\n    ${m}`).join("")}`);
  }

  console.log(`\nEval (${label}) — ${cases.length} documents\n`);
  console.log(rows.join("\n"));
  console.log("\nField accuracy:");
  for (const f of fields) console.log(`  ${f.padEnd(13)} ${((correct[f] / cases.length) * 100).toFixed(0).padStart(4)}%`);
  console.log(`\nMean latency: ${(totalMs / cases.length).toFixed(0)} ms`);
  await terminateOcr();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await runEval();
