import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/workspace/abc?tab=1", "/workspace/abc?tab=1"],
    ["/", "/"],
  ])("allows same-origin path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.example/phish",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "evil.example",
    "",
    "/\u0000admin",
    "/" + "a".repeat(600),
  ])("rejects open redirect %j", (input) => {
    expect(safeRedirectPath(input, "/home")).toBe("/home");
  });

  it("rejects non-strings", () => {
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath({ toString: () => "/x" })).toBe("/");
  });
});
