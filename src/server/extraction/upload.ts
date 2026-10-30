import type { ExtractionResult } from "./result";
import { MAX_UPLOAD_BYTES } from "./input";
import { extractDocument, type PipelineDeps, UnsupportedFileError } from "./pipeline";

export type UploadResponse =
  | { ok: true; result: ExtractionResult; fileHash: string; cached: boolean }
  | { ok: false; error: string };

type Handled = { status: number; body: UploadResponse };

const fail = (status: number, error: string): Handled => ({ status, body: { ok: false, error } });

/** Multipart upload (`file` field) -> extraction. Never saves an expense and never stores the file. */
export async function handleUpload(request: Request, deps: PipelineDeps): Promise<Handled> {
  // Reject oversized bodies before reading them; the multipart envelope adds a little.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return fail(413, "File is too large. The limit is 10 MB.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Expected a file upload.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail(400, "Expected a file upload.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "File is too large. The limit is 10 MB.");

  try {
    const out = await extractDocument(new Uint8Array(await file.arrayBuffer()), deps);
    return { status: 200, body: { ok: true, ...out } };
  } catch (error) {
    if (error instanceof UnsupportedFileError) return fail(415, error.message);
    // Log the failure kind only: never document content.
    console.error(`[extract] failed: ${error instanceof Error ? error.name : "unknown"}`);
    return fail(500, "Couldn't read this file. You can enter it by hand.");
  }
}
