import { expect, type Page, test } from "@playwright/test";

// Next keeps visited pages mounted but hidden; role queries only match the visible one.
const visibleForm = (page: Page) => page.locator("main form:visible");

async function addExpense(page: Page, amount: string, merchant: string, category: string) {
  await page.getByRole("button", { name: "Add expense" }).click();
  await page.getByRole("link", { name: /Enter manually/ }).click();
  await expect(page).toHaveURL("/expenses/new");
  const form = visibleForm(page);
  await form.getByRole("textbox", { name: "Amount" }).fill(amount);
  await form.getByRole("textbox", { name: "Merchant" }).fill(merchant);
  await form.getByText(category, { exact: true }).click();
  await form.getByRole("button", { name: "Save expense" }).click();
  await expect(page).toHaveURL("/expenses");
}

test("add, edit, and delete expenses; totals follow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Track your first expense" })).toBeVisible();

  // Validation keeps what the user typed.
  await page.goto("/expenses/new");
  await visibleForm(page).getByRole("textbox", { name: "Merchant" }).fill("Migros");
  await visibleForm(page).getByRole("button", { name: "Save expense" }).click();
  await expect(page.getByText("Enter an amount like 1.234,56")).toBeVisible();
  await expect(visibleForm(page).getByRole("textbox", { name: "Merchant" })).toHaveValue("Migros");
  await page.goto("/");

  await addExpense(page, "1.234,56", "Migros", "Groceries");
  await expect(page.getByText("Expense saved")).toBeVisible();
  await expect(page.getByRole("link", { name: /Migros.*₺1\.234,56/ })).toBeVisible();

  await addExpense(page, "65,44", "A101", "Groceries");
  await expect(page.getByText("2 expenses")).toBeVisible();

  // Dashboard: month total and category breakdown.
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page.getByText("₺1.300,00").first()).toBeVisible();
  const breakdown = page.getByRole("region", { name: "Where it went" });
  await expect(breakdown.getByRole("link", { name: /Groceries\s*100%\s*₺1\.300,00/ })).toBeVisible();

  // Edit: move A101 to Dining; totals split.
  await page.getByRole("link", { name: /A101/ }).click();
  const form = visibleForm(page);
  await expect(form.getByRole("textbox", { name: "Amount" })).toHaveValue("65,44");
  await form.getByText("Dining", { exact: true }).click();
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL("/expenses");
  await page.getByRole("link", { name: "Home" }).click();
  await expect(breakdown.getByRole("link", { name: /Groceries.*₺1\.234,56/ })).toBeVisible();
  await expect(breakdown.getByRole("link", { name: /Dining.*₺65,44/ })).toBeVisible();

  // Filter the list by category from the breakdown.
  await breakdown.getByRole("link", { name: /Dining/ }).click();
  await expect(page).toHaveURL(/category=/);
  await expect(page.getByRole("link", { name: /A101/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Migros/ })).toHaveCount(0);

  // Delete with confirmation.
  await page.getByRole("link", { name: /A101/ }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Expense deleted")).toBeVisible();
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page.getByText("₺1.234,56").first()).toBeVisible();
  await expect(breakdown.getByRole("link", { name: /Dining/ })).toHaveCount(0);
});
