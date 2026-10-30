import { z } from "zod";

export const privacyModes = ["smart", "local_only", "cloud_first"] as const;
export type PrivacyMode = (typeof privacyModes)[number];

// Empty strings in .env mean "not set".
const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().optional(),
);

const envSchema = z.object({
  GEMINI_API_KEY: optionalString,
  LLM_LOCAL_MODEL: optionalString,
  LLM_CLOUD_MODEL: optionalString,
  PRIVACY_MODE: z.enum(privacyModes).default("smart"),
  CLOUD_DAILY_CAP: z.coerce.number().int().nonnegative().default(500),
  OLLAMA_HOST: z.url().default("http://127.0.0.1:11434"),
  DATABASE_PATH: z.string().min(1).default("./data/app.db"),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
