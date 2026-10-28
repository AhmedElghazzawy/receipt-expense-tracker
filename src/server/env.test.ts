import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("applies safe defaults", () => {
    expect(parseEnv({})).toEqual({
      PRIVACY_MODE: "smart",
      CLOUD_DAILY_CAP: 500,
      OLLAMA_HOST: "http://127.0.0.1:11434",
      DATABASE_PATH: "./data/app.db",
    });
  });

  it("treats empty strings as unset, matching .env.example", () => {
    const env = parseEnv({ GEMINI_API_KEY: "", LLM_LOCAL_MODEL: "  ", CLOUD_DAILY_CAP: "100" });
    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.LLM_LOCAL_MODEL).toBeUndefined();
    expect(env.CLOUD_DAILY_CAP).toBe(100);
  });

  it("rejects an unknown privacy mode", () => {
    expect(() => parseEnv({ PRIVACY_MODE: "yolo" })).toThrow(/PRIVACY_MODE/);
  });

  it("rejects a negative cap", () => {
    expect(() => parseEnv({ CLOUD_DAILY_CAP: "-1" })).toThrow(/CLOUD_DAILY_CAP/);
  });
});
