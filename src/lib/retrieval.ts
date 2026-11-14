import type { Chunk, RetrievalResult } from "./types";

interface RetrievalOptions {
  limit?: number;
  documentIds?: string[];
}

const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "what", "when", "where", "which", "why", "with"]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function retrieve(query: string, allChunks: Chunk[], { limit = 8, documentIds }: RetrievalOptions = {}): RetrievalResult[] {
  const queryTerms = [...new Set(tokenize(query))];
  if (!queryTerms.length || !allChunks.length) return [];

  const selected = documentIds?.length
    ? allChunks.filter((chunk) => documentIds.includes(chunk.documentId))
    : allChunks;
  if (!selected.length) return [];

  const tokenized = selected.map((chunk) => tokenize(chunk.text));
  const averageLength = tokenized.reduce((sum, terms) => sum + terms.length, 0) / tokenized.length || 1;
  const k1 = 1.5;
  const b = 0.75;

  const results = selected.map((chunk, index) => {
    const terms = tokenized[index];
    const frequencies = new Map<string, number>();
    for (const term of terms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const frequency = frequencies.get(term) ?? 0;
      if (!frequency) continue;
      const containingDocuments = tokenized.filter((tokens) => tokens.includes(term)).length;
      const inverseDocumentFrequency = Math.log(1 + (selected.length - containingDocuments + 0.5) / (containingDocuments + 0.5));
      score += inverseDocumentFrequency * ((frequency * (k1 + 1)) / (frequency + k1 * (1 - b + b * (terms.length / averageLength))));
    }
    return { chunk, score };
  });

  return results
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id))
    .slice(0, Math.max(1, Math.min(limit, 12)));
}
