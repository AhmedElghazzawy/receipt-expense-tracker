import { createHash } from "node:crypto";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type FileType = { kind: "pdf"; mimeType: "application/pdf" } | { kind: "image"; mimeType: "image/jpeg" | "image/png" | "image/webp" };

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);

/** Identify uploads by magic bytes, never by the client's file name or MIME type. */
export function sniffFileType(bytes: Uint8Array): FileType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { kind: "pdf", mimeType: "application/pdf" }; // %PDF-
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { kind: "image", mimeType: "image/jpeg" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: "image", mimeType: "image/png" };
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { kind: "image", mimeType: "image/webp" };
  }
  return null;
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
