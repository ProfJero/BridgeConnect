import { expect, test } from "@playwright/test";

import { signIn, signOut, unique } from "./helpers";

test("trust workflow: application → review → approval → workspace", async ({ page }) => {
  const name = unique("Quaye Bakery");

  // 1. A resident applies (they cannot create a listing directly).
  await signIn(page, "capecoast@demo.bridgeconnect.test", "/apply/new");
  await page.getByLabel(/^Type/).selectOption("business");
  await page.getByLabel(/^Sector/).selectOption("commerce");
  await page.getByLabel(/Official name/).fill(name);
  await page.getByLabel(/What do you do/).fill("Fresh bread and pastries baked daily for the Kwamankese community.");
  await page.getByLabel(/^Community/).selectOption({ label: "Kwamankese" });
  await page.getByLabel(/^Phone/).fill("+233 24 555 0101");
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  const applicationPath = new URL(page.url()).pathname;
  const applicationId = applicationPath.split("/").pop()!;

  // Not yet in the public directory.
  await page.goto(`/businesses?q=${encodeURIComponent(name)}`);
  await expect(page.getByText("No matches")).toBeVisible();

  // 2–4. The district verification officer reviews and approves.
  await signOut(page);
  await signIn(page, "verifier@demo.bridgeconnect.test", `/admin/verification/${applicationId}`);
  await page.getByRole("button", { name: "Start review" }).click();
  await expect(page.getByText("Review started.")).toBeVisible();
  await page.getByRole("button", { name: "Approve & verify" }).click();
  await expect(page).toHaveURL(/\/admin\/entities\//);

  // 5. The applicant now owns a workspace and a public, verified listing.
  await signOut(page);
  await signIn(page, "capecoast@demo.bridgeconnect.test", applicationPath);
  await expect(page.getByText("Approved and verified")).toBeVisible();
  await page.getByRole("link", { name: "Open workspace" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.goto(`/businesses?q=${encodeURIComponent(name.split(" ")[0]!)}`);
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
});
