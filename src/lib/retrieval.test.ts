import { describe, expect, it } from "vitest";
import type { Chunk } from "./types";
import { retrieve } from "./retrieval";

const chunks: Chunk[] = [
  { id: "a", documentId: "one", page: 1, text: "Transformers use multi-head self attention without recurrence.", wordCount: 7 },
  { id: "b", documentId: "two", page: 3, text: "A sourdough recipe needs flour and water.", wordCount: 7 },
  { id: "c", documentId: "one", page: 4, text: "Attention heads operate over different representation subspaces.", wordCount: 7 }
];

describe("retrieve", () => {
  it("ranks passages by BM25 relevance", () => {
    const results = retrieve("multi head attention representation", chunks, { limit: 2 });
    expect(results.map((item) => item.chunk.id)).toEqual(["a", "c"]);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("can restrict retrieval to selected documents", () => {
    const results = retrieve("flour attention", chunks, { documentIds: ["one"], limit: 5 });
    expect(results.every((item) => item.chunk.documentId === "one")).toBe(true);
  });

  it("returns no evidence for an unrelated query", () => {
    expect(retrieve("volcanic geology magma", chunks)).toEqual([]);
  });
});
