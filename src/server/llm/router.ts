import type { PrivacyMode } from "@/server/env";

export type DocumentType = "receipt" | "dekont";
export type InputKind = "text_pdf" | "scanned_pdf" | "image";

/**
 * never:    tiers 0-1 only.
 * fallback: cloud only when local OCR or tier 1 is unsure.
 * first:    send straight to cloud for best accuracy.
 */
export type CloudPolicy = "never" | "fallback" | "first";

export type RouteContext = {
  privacyMode: PrivacyMode;
  documentType: DocumentType;
  inputKind: InputKind;
  cloudCallsToday: number;
  cloudDailyCap: number;
  cloudConfigured: boolean;
};

/** Stop calling cloud at 80% of the daily cap (docs/MODEL_ROUTING.md rule 6). */
export function cloudBudgetLeft(callsToday: number, dailyCap: number): boolean {
  return callsToday < Math.floor(dailyCap * 0.8);
}

/** Decides whether a document may use the cloud tier. Pure; see docs/MODEL_ROUTING.md. */
export function cloudPolicy(ctx: RouteContext): { policy: CloudPolicy; reason: string } {
  if (ctx.privacyMode === "local_only") return { policy: "never", reason: "local_only mode" };
  if (ctx.documentType === "dekont") return { policy: "never", reason: "dekonts stay local" };
  if (!ctx.cloudConfigured) return { policy: "never", reason: "no cloud provider configured" };
  if (!cloudBudgetLeft(ctx.cloudCallsToday, ctx.cloudDailyCap)) {
    return { policy: "never", reason: "daily cloud cap reached" };
  }
  if (ctx.inputKind === "text_pdf") {
    // The text layer is exact, so cheaper local steps always go first.
    return ctx.privacyMode === "cloud_first"
      ? { policy: "fallback", reason: "text-layer PDF: local first even in cloud_first" }
      : { policy: "never", reason: "text-layer PDFs stay local" };
  }
  if (ctx.privacyMode === "cloud_first") return { policy: "first", reason: "cloud_first mode" };
  return { policy: "fallback", reason: "smart mode: cloud only if local is unsure" };
}
