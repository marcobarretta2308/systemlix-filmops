import { ProductionPackPDF } from "@/components/pdf/ProductionPackPDF";
import type { ProductionPackPdfData } from "@/lib/pdf/production-pack-types";
import {
  formatProductionPackGeneratedAt,
  PDF_A4_HEIGHT,
  PDF_A4_WIDTH,
  safeText,
} from "@/lib/pdf/pdf-safe";
import { sanitizeProductionPackData } from "@/lib/pdf/sanitize-production-pack-data";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";
import type { ReactElement } from "react";

function logPdfDebugContext(
  stage: string,
  data: ProductionPackPdfData,
  error: unknown
) {
  console.error(`[FilmOps] Production pack PDF ${stage}:`, {
    projectTitle: data.projectTitle,
    sections: data.includedSections,
    pageWidth: PDF_A4_WIDTH,
    pageHeight: PDF_A4_HEIGHT,
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
  });
}

async function renderPackDocument(
  data: ProductionPackPdfData
): Promise<Buffer> {
  const buffer = await renderToBuffer(ProductionPackPDF({ data }));
  return Buffer.from(buffer);
}

const fallbackStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 32,
  },
  heading: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  body: { fontSize: 10, marginBottom: 8, lineHeight: 1.4 },
});

function ProductionPackFallbackPDF({
  data,
  reason,
}: {
  data: ProductionPackPdfData;
  reason: string;
}): ReactElement<DocumentProps> {
  const brand = safeText(data.brand, "Systemlix FilmOps");
  const title = safeText(data.projectTitle, "Untitled Project");
  return (
    <Document>
      <Page size="A4" style={fallbackStyles.page} wrap={false}>
        <Text style={fallbackStyles.heading}>
          {brand} / Production Pack
        </Text>
        <Text style={fallbackStyles.body}>{title}</Text>
        <Text style={fallbackStyles.body}>
          Generated: {formatProductionPackGeneratedAt(data.generatedAt)}
        </Text>
        <Text style={fallbackStyles.body}>
          Some sections could not be rendered. Please retry with fewer sections
          or contact support.
        </Text>
        <Text style={fallbackStyles.body}>
          Error: {safeText(reason, "Unknown error", 500)}
        </Text>
      </Page>
    </Document>
  );
}

/** Minimal fallback PDF when full render fails */
async function renderFallbackPackDocument(
  data: ProductionPackPdfData,
  reason: string
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    ProductionPackFallbackPDF({ data, reason })
  );
  return Buffer.from(buffer);
}

export async function generateProductionPackPdfBuffer(
  rawData: ProductionPackPdfData
): Promise<Buffer> {
  const data = sanitizeProductionPackData(rawData);

  try {
    return await renderPackDocument(data);
  } catch (error) {
    logPdfDebugContext("full render failed", data, error);
    const message =
      error instanceof Error ? error.message : "PDF render failed";
    try {
      return await renderFallbackPackDocument(data, message);
    } catch (fallbackError) {
      logPdfDebugContext("fallback render failed", data, fallbackError);
      throw error;
    }
  }
}
