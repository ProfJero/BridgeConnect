import { expect, test } from "@playwright/test";

import { ENTITY, signIn } from "./helpers";

test.describe("authentication & authorization", () => {
  test("protected pages redirect anonymous visitors to sign-in and back", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Forders/);
    await page.getByLabel("Email").fill("resident@demo.bridgeconnect.test");
    await page.getByLabel("Password").fill("BridgeDemo#2026");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByRole("heading", { name: "My orders" })).toBeVisible();
  });

  test("wrong credentials show a generic error", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("resident@demo.bridgeconnect.test");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "The email or password is incorrect." })).toBeVisible();
  });

  test("open redirects are neutralised", async ({ page }) => {
    await signIn(page, "resident@demo.bridgeconnect.test", "https://evil.example/");
    await expect(page).toHaveURL("http://localhost:3000/");
  });

  test("residents get 403 on the admin console (direct URL access)", async ({ page }) => {
    await signIn(page, "resident@demo.bridgeconnect.test");
    for (const path of ["/admin", "/admin/users", "/admin/settings"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(403);
      await expect(page.getByRole("heading", { name: "You don't have access to this" })).toBeVisible();
    }
  });

  test("scoped admins only reach their modules", async ({ page }) => {
    await signIn(page, "moderator@demo.bridgeconnect.test");
    await page.goto("/admin/moderation");
    await expect(page.getByRole("heading", { name: "Moderation" })).toBeVisible();
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "You don't have access to this" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Platform settings" })).toHaveCount(0);
  });

  test("workspaces are hidden from non-members and capability-gated", async ({ page }) => {
    await signIn(page, "business@demo.bridgeconnect.test");
    const res = await page.goto(`/workspace/${ENTITY.youthFoundation}`);
    expect(res?.status()).toBe(404); // existence is not revealed
    await page.goto(`/workspace/not-a-uuid`);
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
    // A business has no emergency-alert capability.
    await page.goto(`/workspace/${ENTITY.freshFarms}/alerts`);
    await expect(page.getByRole("heading", { name: "You don't have access to this" })).toBeVisible();
  });

  test("invalid ids return not found", async ({ page }) => {
    await page.goto("/community/posts/00000000-0000-4000-8000-000000000000");
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
    await page.goto("/directory/does-not-exist");
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  });
});
