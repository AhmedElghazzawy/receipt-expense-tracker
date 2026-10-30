import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createWorker, OEM, type Worker } from "tesseract.js";

export type OcrResult = { text: string; confidence: number };

const LANGS = ["tur", "eng"] as const;

/**
 * Language data ships in npm packages so OCR works offline (local_only mode).
 * tesseract.js wants one langPath, so both files are copied into one cache dir once.
 */
function localLangPath(): string {
  const dir = join(tmpdir(), "receipt-tracker-ocr-4.0.0_best_int");
  mkdirSync(dir, { recursive: true });
  const require = createRequire(import.meta.url);
  for (const lang of LANGS) {
    const target = join(dir, `${lang}.traineddata.gz`);
    if (!existsSync(target)) {
      const pkg = dirname(require.resolve(`@tesseract.js-data/${lang}/package.json`));
      copyFileSync(join(pkg, "4.0.0_best_int", `${lang}.traineddata.gz`), target);
    }
  }
  return dir;
}

let worker: Promise<Worker> | undefined;

function getWorker(): Promise<Worker> {
  worker ??= createWorker([...LANGS], OEM.LSTM_ONLY, {
    langPath: localLangPath(),
    cachePath: join(tmpdir(), "receipt-tracker-ocr-cache"),
    gzip: true,
  });
  return worker;
}

/** OCR an image with Turkish + English models. Confidence is 0..1 (tesseract reports 0..100). */
export async function ocrImage(bytes: Uint8Array): Promise<OcrResult> {
  const { data } = await (await getWorker()).recognize(Buffer.from(bytes));
  return { text: data.text, confidence: data.confidence / 100 };
}

export async function terminateOcr(): Promise<void> {
  const w = worker;
  worker = undefined;
  if (w) await (await w).terminate();
}
