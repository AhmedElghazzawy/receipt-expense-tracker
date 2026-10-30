import { describe, expect, it, vi } from "vitest";
import { onPendingUpload, setPendingUpload, takePendingUpload } from "./pending-upload";

describe("pending upload hand-off", () => {
  it("hands the file over once and notifies listeners", () => {
    const listener = vi.fn();
    const off = onPendingUpload(listener);
    const file = new File(["x"], "r.png");
    setPendingUpload(file);
    expect(listener).toHaveBeenCalledOnce();
    expect(takePendingUpload()).toBe(file);
    expect(takePendingUpload()).toBeNull();
    off();
    setPendingUpload(file);
    expect(listener).toHaveBeenCalledOnce();
    takePendingUpload();
  });
});
