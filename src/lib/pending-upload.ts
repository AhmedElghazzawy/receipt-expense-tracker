// Hands a picked file from the capture sheet to the scan page, in memory only:
// receipts are never written to disk or storage on the device or the server.

type Listener = () => void;

let pending: File | null = null;
const listeners = new Set<Listener>();

export function setPendingUpload(file: File): void {
  pending = file;
  for (const listener of listeners) listener();
}

/** Returns the waiting file once, then forgets it. */
export function takePendingUpload(): File | null {
  const file = pending;
  pending = null;
  return file;
}

export function onPendingUpload(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
