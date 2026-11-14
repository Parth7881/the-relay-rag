import { describe, expect, it } from "vitest";
import { inspectPdfFile, MAX_PDF_BYTES } from "./pdf-policy";

function file(bytes: number[], name = "paper.pdf", type = "application/pdf") {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("inspectPdfFile", () => {
  it("accepts a PDF with a valid signature", async () => {
    await expect(inspectPdfFile(file([0x25, 0x50, 0x44, 0x46, 0x2d]))).resolves.toEqual({ ok: true });
  });

  it("rejects renamed non-PDF files", async () => {
    const result = await inspectPdfFile(file([0x4d, 0x5a, 0x90, 0x00]));
    expect(result).toEqual({ ok: false, reason: "This file is not a valid PDF." });
  });

  it("rejects files larger than the product limit without reading them", async () => {
    const oversized = { name: "huge.pdf", type: "application/pdf", size: MAX_PDF_BYTES + 1 } as File;
    const result = await inspectPdfFile(oversized);
    expect(result.ok).toBe(false);
  });
});
