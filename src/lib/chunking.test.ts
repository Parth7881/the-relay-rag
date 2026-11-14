import { describe, expect, it } from "vitest";
import { chunkPages } from "./chunking";

describe("chunkPages", () => {
  it("preserves page provenance while creating overlapping chunks", () => {
    const text = Array.from({ length: 90 }, (_, index) => `word${index}`).join(" ");
    const chunks = chunkPages("doc-1", [{ page: 7, text }], { targetWords: 40, overlapWords: 10 });
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.documentId === "doc-1" && chunk.page === 7)).toBe(true);
    expect(chunks[0].text).toContain("word0");
    expect(chunks[1].text).toContain("word30");
  });

  it("drops blank pages and tiny noise-only fragments", () => {
    expect(chunkPages("doc-1", [{ page: 1, text: "   " }, { page: 2, text: "x" }])).toEqual([]);
  });

  it("fails closed when derived chunks exceed the budget", () => {
    const text = Array.from({ length: 200 }, (_, index) => `word${index}`).join(" ");
    expect(() => chunkPages("doc-1", [{ page: 1, text }], { targetWords: 20, overlapWords: 5, maxChunks: 2 })).toThrow(/chunk limit/i);
  });
});
