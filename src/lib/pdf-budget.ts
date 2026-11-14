export const MAX_PDF_PAGES = 400;
export const MAX_EXTRACTED_CHARACTERS = 1_500_000;
export const MAX_PDF_PROCESSING_MS = 20_000;

export function assertPageBudget(pageCount: number): void {
  if (pageCount > MAX_PDF_PAGES) throw new Error(`PDF page limit exceeded (${MAX_PDF_PAGES} pages).`);
}

interface TextBudgetOptions {
  maxCharacters?: number;
  maxDurationMs?: number;
  startedAt?: number;
  now?: () => number;
}

export function createTextBudget({
  maxCharacters = MAX_EXTRACTED_CHARACTERS,
  maxDurationMs = MAX_PDF_PROCESSING_MS,
  startedAt = performance.now(),
  now = () => performance.now()
}: TextBudgetOptions = {}) {
  let characters = 0;
  return {
    add(count: number) {
      if (now() - startedAt > maxDurationMs) throw new Error("PDF processing took too long.");
      characters += count;
      if (characters > maxCharacters) throw new Error("PDF extracted-text limit exceeded.");
      return characters;
    },
    get characters() { return characters; }
  };
}
