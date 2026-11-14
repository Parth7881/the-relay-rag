import type { PageText } from "./types";
import { assertPageBudget, createTextBudget } from "./pdf-budget";

export interface ParsedPdf {
  pages: PageText[];
  pageCount: number;
}

export async function parsePdf(file: File): Promise<ParsedPdf> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages: PageText[] = [];
  const budget = createTextBudget();

  try {
    assertPageBudget(pdf.numPages);
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .filter((item): item is typeof item & { str: string } => "str" in item)
        .map((item) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      budget.add(text.length);
      pages.push({ page: pageNumber, text });
    }
    return { pages, pageCount: pdf.numPages };
  } finally {
    await loadingTask.destroy();
  }
}
