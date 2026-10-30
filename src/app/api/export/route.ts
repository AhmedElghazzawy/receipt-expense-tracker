import { getDb } from "@/server/db/client";
import { exportExpenses } from "@/server/export";

/** GET -> CSV download of the filtered expenses (or `?all=1`). */
export async function GET(request: Request) {
  const { filename, body } = exportExpenses(getDb(), new URL(request.url).searchParams);
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
