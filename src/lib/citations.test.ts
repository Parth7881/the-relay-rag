import { describe, expect, it } from "vitest";
import { validateGroundedClaims } from "./citations";

const sources = [{ id: "S1", documentId: "doc", documentName: "Paper.pdf", page: 2, text: "Multi-head attention attends to multiple representation subspaces." }];

describe("validateGroundedClaims", () => {
  it("accepts a claim with an exact supporting quote and lexical support", () => {
    const result = validateGroundedClaims([{ text: "Attention uses multiple representation subspaces.", citations: ["S1"], quotes: [{ sourceId: "S1", quote: "multiple representation subspaces" }] }], sources);
    expect(result).toEqual({ ok: true, cited: ["S1"], answer: "Attention uses multiple representation subspaces [S1]." });
  });

  it("rejects unknown sources, invented quotes, and weakly related claims", () => {
    expect(validateGroundedClaims([{ text: "It is accurate.", citations: ["S9"], quotes: [{ sourceId: "S9", quote: "accurate" }] }], sources).ok).toBe(false);
    expect(validateGroundedClaims([{ text: "It is accurate.", citations: ["S1"], quotes: [{ sourceId: "S1", quote: "not present" }] }], sources).ok).toBe(false);
    expect(validateGroundedClaims([{ text: "The moon is made of cheese.", citations: ["S1"], quotes: [{ sourceId: "S1", quote: "multiple representation subspaces" }] }], sources).ok).toBe(false);
  });
});
