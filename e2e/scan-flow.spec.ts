import { expect, type Page, test } from "@playwright/test";

const fixture = (name: string) => `evals/fixtures/${name}`;
const visibleForm = (page: Page) => page.locator("main form:visible");

async function upload(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.getByRole("button", { name: "Add expense" }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Upload a file/ }).click();
  await (await chooser).setFiles(file);
  await expect(page).toHaveURL("/expenses/scan");
}

test("scan a receipt, review it, save it; memory and dekonts follow", async ({ page }) => {
  await page.goto("/");

  // Receipt photo: OCR + rules fill everything; nothing needs a second look.
  await upload(page, fixture("receipt-migros.png"));
  const form = visibleForm(page);
  await expect(form.getByRole("textbox", { name: "Amount" })).toHaveValue("297,40", { timeout: 30_000 });
  await expect(form.getByRole("textbox", { name: "Merchant" })).toHaveValue("Migros");
  await expect(form.getByLabel("Date")).toHaveValue("2026-10-28");
  await expect(form.getByRole("radio", { name: "Groceries" })).toBeChecked();
  await expect(page.getByText("Read on this device")).toBeVisible();
  await expect(page.getByText("Not sure about this one")).toHaveCount(0);

  // The user corrects the category and saves.
  await form.getByText("Shopping", { exact: true }).click();
  await form.getByRole("button", { name: "Save expense" }).click();
  await expect(page).toHaveURL("/expenses");
  await expect(page.getByText("Expense saved")).toBeVisible();
  await expect(page.getByRole("link", { name: /Migros.*₺297,40/ })).toBeVisible();

  // Same receipt again: the correction is remembered.
  await upload(page, fixture("receipt-migros.png"));
  await expect(visibleForm(page).getByRole("radio", { name: "Shopping" })).toBeChecked({ timeout: 30_000 });
  await visibleForm(page).getByRole("button", { name: "Discard" }).click();
  await expect(page).toHaveURL("/");

  // Bank dekont PDF: labelled, guessed category flagged for a check.
  await upload(page, fixture("dekont-eft.pdf"));
  await expect(visibleForm(page).getByRole("textbox", { name: "Amount" })).toHaveValue("25.000,00", { timeout: 30_000 });
  await expect(page.getByText("Read on this device · Bank dekont")).toBeVisible();
  await expect(page.getByText("This is a guess. Change it if it's wrong.")).toBeVisible();
  await visibleForm(page).getByRole("button", { name: "Save expense" }).click();
  await expect(page).toHaveURL("/expenses");
  await expect(page.getByRole("link", { name: /ÖRNEK EMLAK.*₺25\.000,00/ })).toBeVisible();

  // Anything else falls back to typing it in, never a dead end.
  await upload(page, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.locator("main").getByRole("alert")).toHaveText("Unsupported file. Upload a PDF, JPEG, PNG, or WebP.");
  await expect(visibleForm(page).getByRole("textbox", { name: "Amount" })).toHaveValue("");
});
