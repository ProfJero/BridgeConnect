import { expect, test } from "@playwright/test";

import { signIn, unique } from "./helpers";

test("residents post, comment and the content is rendered safely", async ({ page }) => {
  let dialogFired = false;
  page.on("dialog", async (d) => {
    dialogFired = true;
    await d.dismiss();
  });
  await signIn(page, "resident@demo.bridgeconnect.test");
  await page.goto("/community/new");
  const title = unique("Market day");
  const payload = `<img src=x onerror="alert('xss')"><script>alert('xss')</script> Market is on Friday`;
  await page.getByLabel(/Title/).fill(title);
  await page.getByLabel(/What would you like to share/).fill(payload);
  await page.getByRole("button", { name: "Post to community" }).click();

  await expect(page).toHaveURL(/\/community\/posts\//);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  // Rendered as text, never as markup.
  await expect(page.getByText(payload)).toBeVisible();
  expect(dialogFired).toBe(false);

  await page.getByLabel("Write a comment").fill("I'll be there!");
  await page.getByRole("button", { name: "Comment" }).click();
  await expect(page.getByText("I'll be there!")).toBeVisible();
});

test("announcements are reserved for verified entities", async ({ page }) => {
  await signIn(page, "resident@demo.bridgeconnect.test");
  await page.goto("/community/new");
  await expect(page.getByLabel(/Type of post/).locator("option", { hasText: "Announcement" })).toHaveCount(0);
});

test("@mobile the public app has a bottom tab bar", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  const tabs = page.getByRole("navigation", { name: "Primary" }).last();
  await expect(tabs.getByRole("link", { name: "Explore" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Post" })).toBeVisible();
});
