// Regenerates synthetic golden-set documents: `node evals/fixtures/make-fixtures.mjs`.
// All names, numbers, and IBANs are fake (TR IBANs use the documentation example).
import { chromium } from "@playwright/test";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const out = dirname(fileURLToPath(import.meta.url));
const mono = "font-family: 'Courier New', monospace; font-size: 15px; line-height: 1.35;";
const row = (l, r) => `<div style="display:flex;justify-content:space-between"><span>${l}</span><span>${r}</span></div>`;

const migros = `<div style="width:340px;padding:24px;background:#fff;color:#111;${mono}">
  <div style="text-align:center;font-weight:bold">MİGROS TİCARET A.Ş.</div>
  <div style="text-align:center">BAHARİYE CAD. NO:12 KADIKÖY</div>
  <div style="text-align:center">V.D. BÜYÜK MÜKELLEFLER 6220529513</div><br/>
  ${row("TARİH: 28.10.2026", "SAAT: 18:42")}${row("FİŞ NO: 0042", "")}<br/>
  ${row("SÜT 1L %1", "*32,50")}${row("EKMEK %1", "*15,00")}${row("DETERJAN %20", "*249,90")}<br/>
  ${row("TOPKDV", "*42,57")}<div style="font-weight:bold">${row("TOPLAM", "*297,40")}</div>
  ${row("NAKİT", "*300,00")}${row("PARA ÜSTÜ", "*2,60")}</div>`;

const dekont = `<div style="padding:48px;font-family:Arial;font-size:13px;color:#111">
  <h2>ÖRNEK BANKASI A.Ş. — EFT DEKONTU</h2>
  <p>İşlem Tarihi: 27.10.2026 10:15</p>
  <p>Gönderen: AYŞE DEMİR</p><p>Gönderen IBAN: TR33 0006 1005 1978 6457 8413 26</p>
  <p>Alıcı Adı: ÖRNEK EMLAK LTD. ŞTİ.</p><p>Alıcı IBAN: TR12 0001 0012 3456 7890 1234 56</p>
  <p>Açıklama: Ekim kirası</p><p><b>İşlem Tutarı: 25.000,00 TL</b></p><p>Masraf: 0,00 TL</p></div>`;

const slip = `<div style="padding:48px;${mono}">
  <p>İŞYERİ ADI: KAHVE DÜNYASI MODA</p><p>TARİH 26/10/26 SAAT 09:12</p><p>SATIŞ</p>
  <p>KART NO: 4543 **** **** 5678</p><p>SATIŞ TUTARI</p><p><b>85,50 TL</b></p></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent(`<body style="margin:0;background:#fff">${migros}</body>`);
await page.locator("body > div").screenshot({ path: `${out}/receipt-migros.png` });
for (const [name, html] of [["dekont-eft", dekont], ["slip-kahve", slip]]) {
  await page.setContent(`<body style="margin:0">${html}</body>`);
  await page.pdf({ path: `${out}/${name}.pdf`, format: "A5" });
}
await browser.close();
console.log("fixtures written to", out);
