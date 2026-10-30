import { describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import { ProviderError } from "./types";

const answer = { merchant: { value: "Migros", confidence: 0.9 } };
const input = { text: "MIGROS\nTOPLAM 297,40", categories: ["Groceries"] };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const requestBody = (fetchFn: ReturnType<typeof vi.fn>) => JSON.parse(fetchFn.mock.calls[0]![1].body as string);

describe("OllamaProvider", () => {
  it("asks /api/chat for schema JSON at temperature 0 without thinking", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json({ message: { content: JSON.stringify(answer) } }));
    const provider = new OllamaProvider("http://127.0.0.1:11434", "qwen3:4b", fetchFn);
    await expect(provider.extract(input)).resolves.toEqual(answer);

    expect(String(fetchFn.mock.calls[0]![0])).toBe("http://127.0.0.1:11434/api/chat");
    const body = requestBody(fetchFn);
    expect(body).toMatchObject({ model: "qwen3:4b", stream: false, think: false, keep_alive: "2m", options: { temperature: 0 } });
    expect(body.format.properties.category.properties.value.enum).toEqual(["Groceries", null]);
    expect(body.messages[0].content).toContain("TOPLAM 297,40");
    expect(provider).toMatchObject({ name: "ollama:qwen3:4b", tier: 1 });
  });

  it.each<[string, () => Promise<Response>, string]>([
    ["offline", () => Promise.reject(new TypeError("fetch failed")), "unavailable"],
    ["model not pulled", async () => json({ error: "model not found" }, 404), "unavailable"],
    ["bad JSON", async () => json({ message: { content: "{oops" } }), "invalid_output"],
  ])("maps %s to %s", async (_label, respond, kind) => {
    const provider = new OllamaProvider("http://127.0.0.1:11434", "qwen3:4b", vi.fn(respond));
    await expect(provider.extract(input)).rejects.toMatchObject({ kind });
  });

  it("needs text: local models here are text-only", async () => {
    const fetchFn = vi.fn();
    await expect(new OllamaProvider("http://x", "m", fetchFn).extract({ categories: [] })).rejects.toBeInstanceOf(ProviderError);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("reports status from /api/tags", async () => {
    const tags = json({ models: [{ name: "qwen3:4b", model: "qwen3:4b" }] });
    expect(await new OllamaProvider("http://x", "qwen3:4b", vi.fn().mockResolvedValue(tags)).status()).toBe("ready");
    const other = json({ models: [{ name: "llama3:latest" }] });
    expect(await new OllamaProvider("http://x", "qwen3", vi.fn().mockResolvedValue(other)).status()).toBe("model_missing");
    expect(await new OllamaProvider("http://x", "qwen3", vi.fn().mockRejectedValue(new Error())).status()).toBe("offline");
  });
});

describe("GeminiProvider", () => {
  const ok = () => json({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] });

  it("calls generateContent with the key in a header and the file inline", async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok());
    const provider = new GeminiProvider("test-key", "flash-model", fetchFn);
    const file = { mimeType: "image/png", data: new Uint8Array([1, 2, 3]) };
    await expect(provider.extract({ ...input, file })).resolves.toEqual(answer);

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/flash-model:generateContent");
    expect(url).not.toContain("test-key");
    expect(init.headers).toMatchObject({ "x-goog-api-key": "test-key" });
    const body = requestBody(fetchFn);
    expect(body.contents[0].parts[1]).toEqual({ inline_data: { mime_type: "image/png", data: "AQID" } });
    expect(body.generationConfig).toMatchObject({ temperature: 0, responseMimeType: "application/json" });
    expect(body.generationConfig.responseJsonSchema.required).toContain("amount");
    expect(provider.tier).toBe(2);
  });

  it("sends text only when no file is given", async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok());
    await new GeminiProvider("k", "m", fetchFn).extract(input);
    expect(requestBody(fetchFn).contents[0].parts).toHaveLength(1);
  });

  it.each<[number, string]>([
    [429, "rate_limited"],
    [503, "unavailable"],
    [400, "other"],
  ])("maps HTTP %i to %s", async (status, kind) => {
    const provider = new GeminiProvider("k", "m", vi.fn().mockResolvedValue(json({ error: {} }, status)));
    await expect(provider.extract(input)).rejects.toMatchObject({ kind });
  });

  it("treats a blocked or empty answer as invalid output", async () => {
    const provider = new GeminiProvider("k", "m", vi.fn().mockResolvedValue(json({ candidates: [] })));
    await expect(provider.extract(input)).rejects.toMatchObject({ kind: "invalid_output" });
  });
});
