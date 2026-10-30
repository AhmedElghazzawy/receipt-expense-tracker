"use client";

import { Cloud, FileText, FileUp, PencilLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { onPendingUpload, takePendingUpload } from "@/lib/pending-upload";
import { reviewInitial, sourceLabel } from "@/lib/review";
import { cn } from "@/lib/utils";
import type { UploadResponse } from "@/server/extraction/upload";
import { ExpenseForm } from "../expense-form";
import { FormSkeleton } from "../skeletons";

type Category = { id: number; name: string; color: string };
type Doc = { file: File; url: string };
type State =
  | { kind: "pick" }
  | ({ kind: "reading" } & Doc)
  | ({ kind: "review"; data: Extract<UploadResponse, { ok: true }> } & Doc)
  | ({ kind: "failed"; error: string } & Doc);

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const blank = { amount: "", currency: "TRY", date: "", merchant: "", categoryId: "", note: "" };

/** Upload -> extraction -> review. The file stays in memory; nothing is saved until the user confirms. */
export function ScanFlow({ categories, today }: { categories: Category[]; today: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "pick" });
  const request = useRef<AbortController | null>(null);

  const start = useCallback((file: File) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const doc = { file, url: URL.createObjectURL(file) };
    setState({ kind: "reading", ...doc });

    const body = new FormData();
    body.set("file", file);
    fetch("/api/extract", { method: "POST", body, signal: controller.signal })
      .then((res) => res.json() as Promise<UploadResponse>)
      .then((data) => setState(data.ok ? { kind: "review", data, ...doc } : { kind: "failed", error: data.error, ...doc }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ kind: "failed", error: "Couldn't reach the app. You can enter it by hand.", ...doc });
        }
      });
  }, []);

  // Files arrive from the capture sheet, also while this page is already open.
  useEffect(() => {
    const take = () => {
      const file = takePendingUpload();
      if (file) start(file);
    };
    take();
    return onPendingUpload(take);
  }, [start]);

  const url = state.kind === "pick" ? null : state.url;
  useEffect(() => (url ? () => URL.revokeObjectURL(url) : undefined), [url]);

  const reset = () => {
    request.current?.abort();
    setState({ kind: "pick" });
  };

  if (state.kind === "pick") return <PickFile onPick={start} />;

  return (
    <div className="flex flex-col gap-6">
      <Preview doc={state} reading={state.kind === "reading"} />
      <p aria-live="polite" className="sr-only">
        {state.kind === "reading" ? "Reading your document" : state.kind === "review" ? "Ready to review" : state.error}
      </p>

      {state.kind === "reading" && <FormSkeleton />}

      {state.kind === "failed" && (
        <>
          <p role="alert" className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-foreground">
            {state.error}
          </p>
          <ExpenseForm
            key={state.url}
            expenseId={null}
            categories={categories}
            today={today}
            initial={{ ...blank, date: today }}
            review={{
              origin: { source: "receipt", fileHash: null },
              uncertain: new Set(),
              onDiscard: () => {
                reset();
                router.push("/");
              },
              onSaved: reset,
            }}
          />
        </>
      )}

      {state.kind === "review" && (
        <Review
          data={state.data}
          categories={categories}
          today={today}
          onDiscard={() => {
            reset();
            router.push("/");
          }}
          onSaved={reset}
        />
      )}
    </div>
  );
}

function Review({
  data,
  categories,
  today,
  onDiscard,
  onSaved,
}: {
  data: Extract<UploadResponse, { ok: true }>;
  categories: Category[];
  today: string;
  onDiscard: () => void;
  onSaved: () => void;
}) {
  const { initial, uncertain } = reviewInitial(data.result, categories, today);
  const source = sourceLabel(data.result.source);
  const Icon = source.cloud ? Cloud : ShieldCheck;

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon aria-hidden className="size-4 shrink-0" />
          {source.text}
          {data.result.document.type === "dekont" && " · Bank dekont"}
        </p>
        <p className="text-sm font-medium">
          {uncertain.size > 0 ? "Check the highlighted fields, then save." : "Looks complete. Check it, then save."}
        </p>
      </div>
      <ExpenseForm
        key={data.fileHash}
        expenseId={null}
        categories={categories}
        today={today}
        initial={initial}
        review={{
          origin: { source: data.result.document.type, fileHash: data.fileHash },
          uncertain,
          onDiscard,
          onSaved,
        }}
      />
    </>
  );
}

function Preview({ doc, reading }: { doc: Doc; reading: boolean }) {
  const isImage = doc.file.type.startsWith("image/");
  return (
    <figure className="relative overflow-hidden rounded-2xl border bg-card">
      {isImage ? (
        // A local blob URL: next/image can't optimise it and doesn't need to.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.url} alt="Your receipt" className="mx-auto max-h-72 w-full object-contain" />
      ) : (
        <div className="flex items-center gap-3 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <FileText className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{doc.file.name}</span>
            <span className="text-sm text-muted-foreground">PDF · {formatSize(doc.file.size)}</span>
          </span>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <a href={doc.url} target="_blank" rel="noreferrer">
              Open
            </a>
          </Button>
        </div>
      )}
      {reading && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="scan-line absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
        </div>
      )}
      <figcaption className={cn("border-t px-4 py-2 text-sm text-muted-foreground", !reading && "sr-only")}>
        {reading ? "Reading your document…" : doc.file.name}
      </figcaption>
    </figure>
  );
}

function PickFile({ onPick }: { onPick: (file: File) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card p-6 text-center transition-colors hover:bg-accent/40 focus-within:ring-3 focus-within:ring-ring/50">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <FileUp className="size-6" />
        </span>
        <span className="font-medium">Choose a receipt or dekont</span>
        <span className="text-sm text-muted-foreground">Photo or PDF, up to 10 MB</span>
        <input
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onPick(file);
          }}
        />
      </label>
      <Button asChild variant="ghost" size="lg" className="h-12 rounded-full">
        <Link href="/expenses/new">
          <PencilLine />
          Enter manually instead
        </Link>
      </Button>
    </div>
  );
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
