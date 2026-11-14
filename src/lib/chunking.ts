import type { Chunk, PageText } from "./types";

interface ChunkOptions {
  targetWords?: number;
  overlapWords?: number;
  maxChunks?: number;
}

export const MAX_CHUNKS_PER_DOCUMENT = 4_000;

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function chunkPages(
  documentId: string,
  pages: PageText[],
  { targetWords = 180, overlapWords = 35, maxChunks = MAX_CHUNKS_PER_DOCUMENT }: ChunkOptions = {}
): Chunk[] {
  if (targetWords < 20 || overlapWords < 0 || overlapWords >= targetWords) {
    throw new Error("Invalid chunking configuration.");
  }

  const chunks: Chunk[] = [];
  const step = targetWords - overlapWords;

  for (const page of pages) {
    const words = normalize(page.text).split(" ").filter(Boolean);
    if (words.length < 5) continue;

    for (let start = 0, sequence = 0; start < words.length; start += step, sequence += 1) {
      const slice = words.slice(start, start + targetWords);
      if (slice.length < 5) break;
      chunks.push({
        id: `${documentId}:p${page.page}:c${sequence}`,
        documentId,
        page: page.page,
        text: slice.join(" "),
        wordCount: slice.length
      });
      if (chunks.length > maxChunks) throw new Error("PDF chunk limit exceeded.");
      if (start + targetWords >= words.length) break;
    }
  }
  return chunks;
}
