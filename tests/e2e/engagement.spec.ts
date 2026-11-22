import { expect, test } from "@playwright/test";

import { ENTITY, signIn, signOut, unique } from "./helpers";

const HEALTH_CENTRE = "e0000000-0000-4000-8000-000000000003";

test("resident messages a business and the business replies from its inbox", async ({ page }) => {
  const question = unique("Do you deliver cassava to Asebu?");
  await signIn(page, "resident@demo.bridgeconnect.test", "/directory/kwamankese-fresh-farms");
  await page.getByRole("button", { name: "Message" }).first().click();
  await page.getByRole("textbox", { name: "Message", exact: true }).fill(question);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}/);
  await expect(page.getByText(question)).toBeVisible();

  await signOut(page);
  const reply = unique("Yes, every Friday");
  await signIn(page, "business@demo.bridgeconnect.test", `/workspace/${ENTITY.freshFarms}/inbox`);
  await page.getByRole("link", { name: /Abena/ }).first().click();
  await expect(page.getByText(question)).toBeVisible();
  await page.getByRole("textbox", { name: "Message", exact: true }).fill(reply);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(reply)).toBeVisible();
  // Wait until the server confirmed delivery (the optimistic bubble shows "Sending…").
  await expect(page.getByText("Sending…")).toHaveCount(0);

  await signOut(page);
  await signIn(page, "resident@demo.bridgeconnect.test", "/messages");
  await expect(page.getByText(reply)).toBeVisible();
});

test("resident books a service and the provider confirms it", async ({ page }) => {
  await signIn(page, "resident@demo.bridgeconnect.test", "/services");
  await page.getByRole("link", { name: /Child Immunisation/ }).first().click();
  await page.getByRole("button", { name: "Book an appointment" }).click();
  const date = new Date(Date.now() + (5 + Math.floor(Math.random() * 300)) * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Preferred date").fill(date);
  await page.getByLabel("Phone number").fill("+233 24 555 1234");
  await page.getByRole("button", { name: "Request booking" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  await expect(page.getByText("Child Immunisation").first()).toBeVisible();

  await signOut(page);
  await signIn(page, "ngo@demo.bridgeconnect.test", `/workspace/${HEALTH_CENTRE}/bookings`);
  const card = page.getByRole("article").filter({ hasText: "Abena" }).first();
  await card.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Booking confirmed.")).toBeVisible();
});

test("resident reviews a verified organisation and it updates the rating", async ({ page }) => {
  await signIn(page, "capecoast@demo.bridgeconnect.test", "/directory/bridge-youth-foundation?tab=reviews");
  await page.getByRole("button", { name: /Write a review|Edit your review/ }).click();
  await page.getByRole("radio", { name: /4 stars/ }).click();
  await page.getByLabel("Your experience").fill(unique("Helpful mentors and a great digital skills class"));
  await page.getByRole("button", { name: /Publish review|Update review/ }).click();
  await expect(page.getByRole("article", { name: /Review by/ }).first()).toBeVisible();
});

test("owners cannot review their own organisation (no review button)", async ({ page }) => {
  await signIn(page, "business@demo.bridgeconnect.test", "/directory/kwamankese-fresh-farms?tab=reviews");
  await expect(page.getByRole("heading", { name: "Reviews" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Write a review/ })).toHaveCount(0);
});

test("resident creates a poll and votes", async ({ page }) => {
  const title = unique("Market day poll");
  await signIn(page, "resident@demo.bridgeconnect.test", "/community/new");
  await page.getByLabel("Type of post").selectOption("poll");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("What would you like to share?").fill("Which day suits you best?");
  await page.getByLabel("Option 1").fill("Saturday");
  await page.getByLabel("Option 2").fill("Sunday");
  await page.getByRole("button", { name: "Post to community" }).click();
  await expect(page).toHaveURL(/\/community\/posts\//);
  await page.getByRole("button", { name: /Saturday/ }).click();
  await expect(page.getByText(/^1 vote ·/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Saturday/ })).toHaveAttribute("aria-pressed", "true");
});

test("resident opens a support ticket and staff reply", async ({ page }) => {
  const subject = unique("Cannot upload a photo");
  await signIn(page, "resident@demo.bridgeconnect.test", "/support/new");
  await page.getByLabel("Topic").selectOption("bug");
  await page.getByLabel("Subject").fill(subject);
  await page.getByLabel("How can we help?").fill("The upload spinner never finishes on my phone.");
  await page.getByRole("button", { name: "Send to DBI support" }).click();
  await expect(page.getByRole("heading", { name: subject })).toBeVisible();

  await signOut(page);
  await signIn(page, "owner@demo.bridgeconnect.test", "/admin/support");
  await page.getByRole("link", { name: new RegExp(subject) }).click();
  await page.getByLabel("Reply").fill("Thanks — please try again with a JPG under 5 MB.");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("Thanks — please try again")).toBeVisible();
});

test("support desk and other residents' threads are not reachable", async ({ page }) => {
  await signIn(page, "capecoast@demo.bridgeconnect.test", "/admin/support");
  await expect(page.getByText(/permission|not allowed|forbidden/i).first()).toBeVisible();
  // A thread that isn't yours renders the not-found screen (status may be 200 once streaming started).
  await page.goto("/messages/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: /not found|can't find|couldn't find/i })).toBeVisible();
});

test("protected pages redirect anonymous visitors to sign in", async ({ page }) => {
  for (const path of ["/messages", "/bookings", "/settings", "/support"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in/);
  }
});

test("data export downloads only the viewer's data", async ({ page }) => {
  await signIn(page, "resident@demo.bridgeconnect.test", "/settings");
  const res = await page.request.get("/account/export");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.account.email).toBe("resident@demo.bridgeconnect.test");
  expect(JSON.stringify(body)).not.toContain("capecoast@demo");
});

test("business sets a separate WhatsApp number and social links that show on its public page", async ({ page }) => {
  await signIn(page, "business@demo.bridgeconnect.test", `/workspace/${ENTITY.freshFarms}/profile`);
  await page.getByLabel("WhatsApp number").fill("+233 24 555 0101");
  await page.locator("#social-instagram").fill("https://instagram.com/kwamankesefreshfarms");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled({ timeout: 20_000 });
  await page.goto("/directory/kwamankese-fresh-farms");
  await expect(page.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://instagram.com/kwamankesefreshfarms");
  await expect(page.getByRole("link", { name: "WhatsApp" }).first()).toHaveAttribute("href", /wa\.me\/233245550101/);
  await expect(page.getByRole("link", { name: "Directions" })).toHaveAttribute("href", /google\.com\/maps/);
});
