export const MAX_PDF_BYTES = 25 * 1024 * 1024;

export type PdfInspection = { ok: true } | { ok: false; reason: string };

export async function inspectPdfFile(file: File): Promise<PdfInspection> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false, reason: "Choose a .pdf file." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, reason: "PDFs must be 25 MB or smaller." };
  }
  if (file.size < 5) {
    return { ok: false, reason: "This file is not a valid PDF." };
  }

  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPdf = signature[0] === 0x25 && signature[1] === 0x50 && signature[2] === 0x44 && signature[3] === 0x46 && signature[4] === 0x2d;
  return isPdf ? { ok: true } : { ok: false, reason: "This file is not a valid PDF." };
}
