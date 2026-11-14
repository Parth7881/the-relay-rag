import type { EvidenceSource, RelayDocument, RetrievalResult } from "./types";

export function toEvidence(results: RetrievalResult[], documents: RelayDocument[]): EvidenceSource[] {
  const names = new Map(documents.map((document) => [document.id, document.name]));
  return results.map(({ chunk }, index) => ({
    id: `S${index + 1}`,
    documentId: chunk.documentId,
    documentName: names.get(chunk.documentId) ?? "Unknown document",
    page: chunk.page,
    text: chunk.text
  }));
}
