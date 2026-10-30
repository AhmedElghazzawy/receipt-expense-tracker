"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { expenseFormSchema } from "@/lib/expense-input";
import { getDb } from "@/server/db/client";
import { createExpense, deleteExpense, updateExpense } from "@/server/db/expenses";
import { rememberMerchantCategory } from "@/server/db/memory";
import { expenseSources } from "@/server/db/schema";

export type FormValues = Partial<Record<"amount" | "currency" | "date" | "merchant" | "categoryId" | "note", string>>;

export type SaveState =
  | { ok: true }
  | { ok: false; fieldErrors?: Partial<Record<keyof FormValues, string>>; formError?: string; values?: FormValues };

const idSchema = z.number().int().positive().nullable();

// Set by the review screen for scanned documents; plain forms send neither.
const originSchema = z.object({
  source: z.enum(expenseSources).catch("manual"),
  fileHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable()
    .catch(null),
});

/** Create (id = null) or update an expense from the form. Route stays thin: parse, call, respond. */
export async function saveExpense(id: number | null, _prev: SaveState | null, formData: FormData): Promise<SaveState> {
  const values: FormValues = {};
  for (const key of ["amount", "currency", "date", "merchant", "categoryId", "note"] as const) {
    const v = formData.get(key);
    if (typeof v === "string") values[key] = v;
  }

  const parsedId = idSchema.safeParse(id);
  const parsed = expenseFormSchema.safeParse(values);
  if (!parsedId.success) return { ok: false, formError: "Invalid expense id.", values };
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof FormValues;
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, fieldErrors, values };
  }

  const db = getDb();
  if (parsedId.data === null) {
    const origin = originSchema.parse({ source: formData.get("source"), fileHash: formData.get("fileHash") });
    createExpense(db, parsed.data, origin);
  } else if (!updateExpense(db, parsedId.data, parsed.data)) {
    return { ok: false, formError: "This expense no longer exists.", values };
  }
  // The user's choice teaches the next extraction (merchant memory).
  if (parsed.data.merchant && parsed.data.categoryId) {
    rememberMerchantCategory(db, parsed.data.merchant, parsed.data.categoryId);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeExpense(id: number): Promise<{ ok: boolean }> {
  const parsedId = z.number().int().positive().safeParse(id);
  if (!parsedId.success) return { ok: false };
  const ok = deleteExpense(getDb(), parsedId.data);
  revalidatePath("/", "layout");
  return { ok };
}
