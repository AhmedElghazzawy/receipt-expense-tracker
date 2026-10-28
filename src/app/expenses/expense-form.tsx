"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useId, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currencies } from "@/lib/money";
import { categoryFill } from "@/lib/category-color";
import { cn } from "@/lib/utils";
import { type FormValues, type SaveState, removeExpense, saveExpense } from "./actions";

type Category = { id: number; name: string; color: string };

export function ExpenseForm({
  expenseId,
  initial,
  categories,
  today,
}: {
  expenseId: number | null;
  initial: Required<FormValues>;
  categories: Category[];
  today: string;
}) {
  const router = useRouter();
  // Unique per instance: Next keeps visited pages mounted (hidden), so two forms can coexist.
  const uid = useId();
  const fid = (field: keyof FormValues) => `${uid}-${field}`;
  const [state, formAction, pending] = useActionState(async (prev: SaveState | null, formData: FormData) => {
    const result = await saveExpense(expenseId, prev, formData);
    if (result.ok) {
      toast.success(expenseId ? "Expense updated" : "Expense saved");
      router.push("/expenses");
    }
    return result;
  }, null);

  // React resets the form after an action; feed submitted values back so nothing is lost on error.
  const values = { ...initial, ...(state && !state.ok ? state.values : {}) };
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errorProps = (field: keyof FormValues) =>
    errors[field] ? { "aria-invalid": true, "aria-describedby": `${fid(field)}-error` } : {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state && !state.ok && state.formError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </p>
      )}

      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-4 py-6">
        <Label htmlFor={fid("amount")} className="text-muted-foreground">
          Amount
        </Label>
        <div className="flex w-full items-center justify-center gap-2">
          <select
            name="currency"
            aria-label="Currency"
            defaultValue={values.currency}
            className="h-11 rounded-lg border border-input bg-transparent px-2 text-base font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            id={fid("amount")}
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            defaultValue={values.amount}
            autoFocus={!expenseId}
            {...errorProps("amount")}
            className="w-full max-w-56 min-w-0 bg-transparent text-center text-display font-semibold tabular-nums tracking-tight outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        <FieldError id={`${fid("amount")}-error`} message={errors.amount} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Merchant" htmlFor={fid("merchant")} error={errors.merchant}>
          <Input
            id={fid("merchant")}
            name="merchant"
            placeholder="e.g. Migros"
            autoComplete="off"
            defaultValue={values.merchant}
            className="h-11"
            {...errorProps("merchant")}
          />
        </Field>
        <Field label="Date" htmlFor={fid("date")} error={errors.date}>
          <Input
            id={fid("date")}
            name="date"
            type="date"
            max={today}
            defaultValue={values.date}
            className="h-11"
            {...errorProps("date")}
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Category</legend>
        <div className="flex flex-wrap gap-2">
          {[{ id: "", name: "None", color: null }, ...categories].map((c) => (
            <label key={c.id} className="relative">
              <input
                type="radio"
                name="categoryId"
                value={c.id}
                defaultChecked={values.categoryId === String(c.id)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex h-11 cursor-pointer items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition-colors select-none",
                  "hover:bg-secondary peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-foreground",
                  "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                )}
              >
                {c.color && <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: categoryFill(c.color) }} />}
                {c.name}
              </span>
            </label>
          ))}
        </div>
        <FieldError id={`${fid("categoryId")}-error`} message={errors.categoryId} />
      </fieldset>

      <Field label="Note" htmlFor={fid("note")} error={errors.note} optional>
        <Textarea id={fid("note")} name="note" rows={2} defaultValue={values.note} {...errorProps("note")} />
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {expenseId && <DeleteButton id={expenseId} />}
        <Button type="submit" size="lg" disabled={pending} className="h-12 rounded-full text-base sm:ml-auto sm:min-w-40">
          {pending && <LoaderCircle className="animate-spin" />}
          {expenseId ? "Save changes" : "Save expense"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      <FieldError id={`${htmlFor}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

function DeleteButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onDelete = () =>
    startTransition(async () => {
      const { ok } = await removeExpense(id);
      if (ok) toast.success("Expense deleted");
      else toast.error("It was already deleted");
      router.push("/expenses");
    });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="lg" className="h-12 rounded-full text-destructive hover:text-destructive">
          <Trash2 />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
          <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDelete} disabled={pending}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
