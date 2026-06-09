import { ProductionReportPDF } from "@/components/pdf/ProductionReportPDF";
import type { ProductionReportPdfData } from "@/lib/pdf/production-report-types";
import { renderToBuffer } from "@react-pdf/renderer";

export async function generateProductionReportPdfBuffer(
  data: ProductionReportPdfData
): Promise<Buffer> {
  const buffer = await renderToBuffer(ProductionReportPDF({ data }));
  return Buffer.from(buffer);
}
