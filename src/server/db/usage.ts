import { eq, sql } from "drizzle-orm";
import type { Db } from "./client";
import { cloudUsage } from "./schema";

/** Cloud calls made on `day` (YYYY-MM-DD), for the daily cap. */
export function cloudCallsOn(db: Db, day: string): number {
  return db.select({ calls: cloudUsage.calls }).from(cloudUsage).where(eq(cloudUsage.day, day)).get()?.calls ?? 0;
}

/** Counts a cloud call, including failed ones: rate limits count requests, not successes. */
export function recordCloudCall(db: Db, day: string): void {
  db.insert(cloudUsage)
    .values({ day, calls: 1 })
    .onConflictDoUpdate({ target: cloudUsage.day, set: { calls: sql`${cloudUsage.calls} + 1` } })
    .run();
}
