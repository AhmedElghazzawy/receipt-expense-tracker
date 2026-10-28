import { z } from "zod";
import { isFutureDate, todayIso } from "./dates";
import { currencies, parseAmount } from "./money";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

/** Validated expense as stored. Shared by server actions and forms. */
export const expenseInputSchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: z.enum(currencies),
  date: z.iso.date().refine((d) => !isFutureDate(d, todayIso()), "Date can't be in the future"),
  merchant: optionalText(200),
  categoryId: z.number().int().positive().nullable(),
  note: optionalText(500),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

/** Raw form fields (all strings) -> ExpenseInput. */
export const expenseFormSchema = z
  .object({
    amount: z.string(),
    currency: z.string(),
    date: z.string(),
    merchant: z.string().default(""),
    categoryId: z.string().default(""),
    note: z.string().default(""),
  })
  .transform(({ amount, categoryId, ...rest }, ctx): ExpenseInput => {
    const amountMinor = parseAmount(amount);
    if (amountMinor === null || amountMinor === 0) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter an amount like 1.234,56" });
      return z.NEVER;
    }
    const result = expenseInputSchema.safeParse({
      ...rest,
      amountMinor,
      categoryId: categoryId === "" ? null : Number(categoryId),
    });
    if (!result.success) {
      for (const issue of result.error.issues) ctx.addIssue({ ...issue, code: "custom" });
      return z.NEVER;
    }
    return result.data;
  });
