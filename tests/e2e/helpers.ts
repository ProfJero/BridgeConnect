import { expect, type Page } from "@playwright/test";

export const PASSWORD = process.env.DEMO_PASSWORD ?? "BridgeDemo#2026";
export const ENTITY = {
  freshFarms: "e0000000-0000-4000-8000-000000000001",
  youthFoundation: "e0000000-0000-4000-8000-000000000002",
};

export async function signIn(page: Page, email: string, next = "/") {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/sign-in/);
}

export async function signOut(page: Page) {
  await page.context().clearCookies();
}

export const unique = (label: string) => `${label} ${Date.now().toString(36)}`;
