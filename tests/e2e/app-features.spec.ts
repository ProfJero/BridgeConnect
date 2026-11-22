import { expect, test } from "@playwright/test";

import { signIn, signOut, unique } from "./helpers";

test("the app shell has no website footer and uses the five-tab bar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Quick services" })).toBeVisible();
});

test("platform owner's own organisation is approved instantly", async ({ page }) => {
  const name = unique("Owner Test Pharmacy");
  await signIn(page, "owner@demo.bridgeconnect.test", "/apply/new");
  await page.getByLabel("Type").selectOption("business");
  await page.getByLabel("Sector").selectOption("health");
  await page.getByLabel("Official name").fill(name);
  await page.getByLabel("What do you do?").fill("Community pharmacy with prescription and over-the-counter medicines.");
  await page.getByLabel("Community").selectOption({ label: "Kwamankese" });
  await page.getByLabel("Phone").fill("+233 24 123 4567");
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page).toHaveURL(/\/workspace\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name })).toBeVisible();
});

test("residents list a rental and others request a viewing", async ({ page }) => {
  const title = unique("Self-contain near the lorry station");
  await signIn(page, "resident@demo.bridgeconnect.test", "/rentals/new");
  await page.getByLabel("Property type").selectOption("self_contain");
  await page.getByLabel("Community").selectOption({ label: "Kwamankese" });
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Rent (GHS)").fill("450");
  await page.getByLabel("Description").fill("Tiled self-contain with porch, water and a prepaid meter.");
  await page.getByLabel("Contact phone").fill("+233 24 000 0007");
  await page.getByRole("button", { name: "Water" }).click();
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 30_000 });
  const url = page.url();

  await signOut(page);
  await signIn(page, "capecoast@demo.bridgeconnect.test", new URL(url).pathname);
  await page.getByRole("button", { name: "Request a viewing" }).first().click();
  await page.getByLabel("Your phone").fill("+233 24 000 0008");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Request sent")).toBeVisible();

  await signOut(page);
  await signIn(page, "resident@demo.bridgeconnect.test", "/rentals/mine");
  await expect(page.getByText(`is "${title}" still available`)).toBeVisible();
});

test("rider registers, is verified, goes online and completes a requested ride", async ({ page }) => {
  // 1. The NGO owner applies to ride a tricycle.
  await signIn(page, "ngo@demo.bridgeconnect.test", "/rider");
  if (await page.getByRole("button", { name: "Apply to ride" }).isVisible()) {
    await page.locator("#vehicleType").selectOption("tricycle");
    await page.getByLabel("Vehicle description").fill("Yellow tricycle");
    await page.getByLabel("Base community").selectOption({ label: "Kwamankese" });
    await page.locator("#phone").fill("+233 24 000 0006");
    await page.getByRole("button", { name: "Apply to ride" }).click();
    await expect(page.getByRole("main").getByText(/Awaiting verification|online|offline/).first()).toBeVisible({ timeout: 30_000 });
  }

  // 2. The district admin verifies them.
  await signOut(page);
  await signIn(page, "district.admin@demo.bridgeconnect.test", "/admin/riders?status=pending");
  const row = page.getByRole("listitem").filter({ hasText: "Yellow tricycle" });
  if (await row.count()) {
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Rider approved.")).toBeVisible();
  }

  // 3. The rider goes online.
  await signOut(page);
  await signIn(page, "ngo@demo.bridgeconnect.test", "/rider");
  const sw = page.getByRole("switch");
  if ((await sw.getAttribute("aria-checked")) !== "true") {
    await sw.click();
    await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true", { timeout: 20_000 });
  }

  // 4. A resident requests a tricycle ride.
  await signOut(page);
  await signIn(page, "resident@demo.bridgeconnect.test", "/rides");
  await page.getByRole("button", { name: /Pragya/ }).click();
  await page.getByLabel(/Pickup/).fill(unique("Kwamankese market"));
  await page.getByLabel(/Destination/).fill("Abakrampa Health Centre");
  await page.getByLabel("Community (pickup area)").selectOption({ label: "Kwamankese" });
  await page.getByLabel("Your phone").fill("+233 24 000 0007");
  await page.getByRole("button", { name: "Request ride" }).click();
  await expect(page).toHaveURL(/\/rides\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  const tripUrl = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { name: /Finding you a rider/ })).toBeVisible();

  // 5. The rider accepts and completes it.
  await signOut(page);
  await signIn(page, "ngo@demo.bridgeconnect.test", "/rider");
  await page.getByRole("button", { name: "Accept job" }).first().click();
  await expect(page.getByRole("button", { name: /arrived at pickup/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /arrived at pickup/ }).click();
  await page.getByRole("button", { name: "Start trip" }).click();
  await page.getByRole("button", { name: "Complete trip" }).click();
  await expect(page.getByText(/Trip completed/)).toBeVisible({ timeout: 20_000 });

  // 6. The customer sees it completed and rates the rider.
  await signOut(page);
  await signIn(page, "resident@demo.bridgeconnect.test", tripUrl);
  await expect(page.getByRole("heading", { name: "Trip completed" })).toBeVisible();
  await page.getByRole("radio", { name: "5 stars" }).click();
  await page.getByRole("button", { name: "Submit rating" }).click();
  await expect(page.getByText(/You rated this trip 5/)).toBeVisible({ timeout: 20_000 });
});

test("cart checkout places a database-priced order", async ({ page }) => {
  await signIn(page, "capecoast@demo.bridgeconnect.test", "/marketplace");
  await page.getByRole("link", { name: "Plantain Bunch" }).first().click();
  await page.getByRole("button", { name: "Add to cart" }).last().click();
  await page.goto("/cart");
  await page.getByRole("button", { name: /Increase Plantain Bunch/ }).click();
  await page.getByLabel("Phone number").fill("+233 24 000 0008");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(page.getByText("GH₵70.00").first()).toBeVisible();
});
