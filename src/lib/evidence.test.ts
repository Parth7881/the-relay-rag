import { describe, expect, it } from "vitest";
import type { RelayDocument, RetrievalResult } from "./types";
import { toEvidence } from "./evidence";

describe("toEvidence", () => {
  it("assigns stable citation labels and document names", () => {
    const documents: RelayDocument[] = [{ id: "d1", name: "Study.pdf", size: 10, pageCount: 2, chunkCount: 1, createdAt: "2026-01-01", status: "ready" }];
    const results: RetrievalResult[] = [{ chunk: { id: "c1", documentId: "d1", page: 2, text: "A sufficiently long passage about attention and sequence models.", wordCount: 9 }, score: 1 }];
    expect(toEvidence(results, documents)).toEqual([{ id: "S1", documentId: "d1", documentName: "Study.pdf", page: 2, text: results[0].chunk.text }]);
  });
});
