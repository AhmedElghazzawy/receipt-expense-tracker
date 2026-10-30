import { todayIso } from "@/lib/dates";
import { getDb } from "@/server/db/client";
import { getEnv } from "@/server/env";
import { handleUpload } from "@/server/extraction/upload";
import { modelStepFromEnv } from "@/server/llm/model-step";

/** POST multipart `file` -> extracted fields for the review screen. Saves nothing. */
export async function POST(request: Request) {
  const db = getDb();
  const today = todayIso();
  const { status, body } = await handleUpload(request, { db, today, modelStep: modelStepFromEnv(getEnv(), db, today) });
  return Response.json(body, { status });
}
