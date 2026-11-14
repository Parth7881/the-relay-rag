import { describe, expect, it } from "vitest";
import { providerError } from "./provider-error";

describe("providerError", () => {
  it("distinguishes credentials, rejected requests, rate limits, and outages", () => {
    expect(providerError(401)).toEqual({ status: 503, message: "The model credential is invalid or has been revoked." });
    expect(providerError(400)).toEqual({ status: 422, message: "The model rejected this request. Try a more specific question or select fewer documents." });
    expect(providerError(429)).toEqual({ status: 429, message: "The model is rate-limited. Try again shortly." });
    expect(providerError(503)).toEqual({ status: 503, message: "The model provider is temporarily unavailable. Try again shortly." });
  });
});
