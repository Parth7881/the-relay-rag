import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("browser compatibility headers", () => {
  it("does not isolate the page from the in-app browser opener", async () => {
    const rules = await nextConfig.headers?.();
    const headers = rules?.flatMap((rule) => rule.headers) ?? [];

    expect(headers.some((header) => header.key.toLowerCase() === "cross-origin-opener-policy")).toBe(false);
    expect(headers).toContainEqual({ key: "X-Frame-Options", value: "DENY" });
  });
});
