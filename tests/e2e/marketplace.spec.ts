import { expect, test } from "@playwright/test";

import { ENTITY, signIn, signOut } from "./helpers";

test("order flow: resident orders, seller confirms, buyer is updated", async ({ page }) => {
  await signIn(page, "resident@demo.bridgeconnect.test");
  await page.goto("/marketplace/plantain-bunch");
  const quantity = page.getByLabel(/Quantity/);
  await quantity.clear();
  await quantity.fill("2");
  await page.getByLabel(/Phone number/).fill("+233 24 000 0007");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  const orderUrl = page.url();
  const orderNumber = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await expect(page.getByText("GH₵70.00").first()).toBeVisible(); // 2 × 35.00, priced by the database

  await signOut(page);
  await signIn(page, "business@demo.bridgeconnect.test", `/workspace/${ENTITY.freshFarms}/orders`);
  await page.getByRole("link", { name: orderNumber }).click();
  await page.getByRole("button", { name: "Confirm order" }).click();
  await expect(page.getByText("Order updated.")).toBeVisible();

  await signOut(page);
  await signIn(page, "resident@demo.bridgeconnect.test", new URL(orderUrl).pathname);
  await expect(page.getByText("Confirmed").first()).toBeVisible();
});
