import { CallSheetPDF } from "@/components/pdf/CallSheetPDF";
import type { CallSheetPdfData } from "@/lib/pdf/call-sheet-types";
import { renderToBuffer } from "@react-pdf/renderer";

export async function generateCallSheetPdfBuffer(
  data: CallSheetPdfData
): Promise<Buffer> {
  const buffer = await renderToBuffer(CallSheetPDF({ data }));
  return Buffer.from(buffer);
}
