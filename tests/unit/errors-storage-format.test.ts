import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { toUserMessage } from "@/lib/errors";
import { formatMoney, humanize, initials } from "@/lib/format";
import { enumParam, stringParam, uuidParam } from "@/lib/search-params";
import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES, validateFile } from "@/lib/storage";

describe("toUserMessage never leaks internals", () => {
  it("passes through deliberate, user-safe messages", () => {
    expect(toUserMessage({ code: "54000", message: "Posting limit reached." })).toBe("Posting limit reached.");
  });
  it("masks RLS and unknown errors", () => {
    expect(toUserMessage({ code: "42501", message: 'new row violates row-level security policy for table "posts"' })).toBe("You don't have permission to do that.");
    expect(toUserMessage({ code: "XX000", message: "internal: relation private.secret" })).toBe("Something went wrong. Please try again.");
  });
});

describe("file validation", () => {
  it("accepts allowed images within limits", () => {
    expect(validateFile({ type: "image/png", size: 1024 }, IMAGE_MIME_TYPES, MAX_IMAGE_BYTES).ok).toBe(true);
  });
  it.each([
    [{ type: "image/svg+xml", size: 100 }, "SVG can carry script"],
    [{ type: "text/html", size: 100 }, "HTML"],
    [{ type: "image/png", size: 0 }, "empty"],
    [{ type: "image/png", size: MAX_IMAGE_BYTES + 1 }, "too large"],
  ])("rejects %o (%s)", (file) => {
    expect(validateFile(file, IMAGE_MIME_TYPES, MAX_IMAGE_BYTES).ok).toBe(false);
  });
});

describe("formatting & params", () => {
  it("formats money and labels", () => {
    expect(formatMoney(25, "GHS")).toContain("25.00");
    expect(formatMoney(null)).toBe("—");
    expect(humanize("full_time")).toBe("Full time");
    expect(initials("Ama Kwesi Owusu")).toBe("AK");
  });
  it("sanitises search params", () => {
    expect(uuidParam("not-a-uuid")).toBeUndefined();
    expect(uuidParam(["8f14e45f-ceea-467a-9f3c-5b4c7d1f2a01"])).toBe("8f14e45f-ceea-467a-9f3c-5b4c7d1f2a01");
    expect(enumParam("drop", ["open", "closed"] as const)).toBeUndefined();
    expect(stringParam("  x  ".padEnd(300, "y"), 10)?.length).toBe(10);
  });
});
