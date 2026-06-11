import type { ProductionPackPdfData } from "@/lib/pdf/production-pack-types";
import {
  chunkArray,
  noHyphenation,
  PDF_A4_HEIGHT,
  PDF_CONTENT_MAX_HEIGHT,
  PDF_PAGE_MARGIN,
  PDF_PAGE_BOTTOM,
  safeCount,
  safePercentWidth,
  safeScore,
  safeText,
  formatProductionPackGeneratedAt,
  truncateForPdf,
} from "@/lib/pdf/pdf-safe";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
  type Styles,
} from "@react-pdf/renderer";
import type { ReactElement, ReactNode } from "react";

const COLORS = {
  black: "#1a1a1a",
  mid: "#4a4a4a",
  muted: "#9a9a9a",
  line: "#e8e8e8",
  band: "#f7f7f7",
  headerBg: "#f3f3f3",
  rowAlt: "#fafafa",
  coverAccent: "#2a2a2a",
};

const SCENES_PER_PAGE = 3;
const CAST_PER_PAGE = 14;
const LOCATIONS_PER_PAGE = 4;
const DAYS_PER_PAGE = 5;
const SHEETS_PER_PAGE = 4;
const DOCS_PER_PAGE = 12;
const REPORTS_PER_PAGE = 4;
const DEPT_NOTES_PER_PAGE = 6;

const LABEL_W = safePercentWidth(0.34);
const VALUE_W = safePercentWidth(0.66);

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: COLORS.black,
    paddingTop: PDF_PAGE_MARGIN,
    paddingHorizontal: PDF_PAGE_MARGIN,
    paddingBottom: PDF_PAGE_BOTTOM,
    lineHeight: 1.35,
    backgroundColor: "#ffffff",
  },
  contentArea: {
    maxHeight: PDF_CONTENT_MAX_HEIGHT,
  },
  coverAccentBar: {
    width: 48,
    height: 3,
    backgroundColor: COLORS.coverAccent,
    marginBottom: 16,
    borderRadius: 1,
  },
  coverHeader: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  coverMainTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: COLORS.coverAccent,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  coverSubtitle: {
    fontSize: 10,
    color: COLORS.mid,
    marginBottom: 22,
    lineHeight: 1.45,
  },
  projectBlock: {
    backgroundColor: COLORS.band,
    borderWidth: 0.5,
    borderColor: COLORS.line,
    borderRadius: 4,
    padding: 14,
    marginBottom: 18,
  },
  projectBlockRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  projectBlockLabel: {
    width: 72,
    fontSize: 8,
    color: COLORS.muted,
    fontFamily: "Helvetica-Bold",
  },
  projectBlockValue: {
    width: safePercentWidth(0.62),
    fontSize: 9,
    color: COLORS.black,
  },
  projectBlockValueHighlight: {
    width: safePercentWidth(0.62),
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
  },
  snapshotTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: COLORS.mid,
    marginBottom: 10,
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  snapshotPill: {
    width: "31%",
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: COLORS.line,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: "2%",
    marginBottom: 6,
  },
  snapshotPillLabel: {
    fontSize: 7,
    color: COLORS.muted,
    marginBottom: 3,
  },
  snapshotPillValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
  },
  tocBox: {
    backgroundColor: COLORS.band,
    borderWidth: 0.5,
    borderColor: COLORS.line,
    borderRadius: 4,
    padding: 14,
    marginTop: 4,
  },
  tocHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  tocColumns: {
    flexDirection: "row",
  },
  tocCol: {
    width: "48%",
    marginRight: "4%",
  },
  tocItem: {
    fontSize: 8,
    color: COLORS.mid,
    marginBottom: 7,
    lineHeight: 1.4,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    marginTop: 4,
    paddingBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  subsection: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.mid,
    marginTop: 10,
    marginBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: {
    width: LABEL_W,
    color: COLORS.muted,
    fontSize: 7.5,
    paddingRight: 8,
  },
  value: { width: VALUE_W, fontSize: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.headerBg,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  cell: { fontSize: 7.5 },
  noteBox: {
    backgroundColor: COLORS.band,
    padding: 8,
    borderRadius: 2,
    marginBottom: 6,
  },
  empty: { color: COLORS.muted, fontStyle: "italic", fontSize: 8 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: PDF_PAGE_MARGIN,
    right: PDF_PAGE_MARGIN,
    fontSize: 6,
    color: COLORS.muted,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.line,
    paddingTop: 5,
    textAlign: "center",
  },
  sceneCard: {
    backgroundColor: COLORS.band,
    padding: 8,
    borderRadius: 2,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: COLORS.line,
  },
  scoreBox: {
    backgroundColor: COLORS.headerBg,
    padding: 12,
    borderRadius: 3,
    marginBottom: 10,
    alignItems: "center",
  },
  scoreValue: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
  },
  unavailable: {
    color: COLORS.mid,
    fontStyle: "italic",
    fontSize: 8,
    marginTop: 6,
  },
});

function PageFooter({ brand }: { brand: string }) {
  const safeBrand = safeText(brand, "Systemlix FilmOps", 80);
  return (
    <Text
      style={styles.footer}
      fixed
      hyphenationCallback={noHyphenation}
      render={({ pageNumber, totalPages }) => {
        const page = safeCount(pageNumber);
        const total = safeCount(totalPages);
        return `${safeBrand} · Production Pack · Page ${page} of ${total}`;
      }}
    />
  );
}

function PackPage({
  brand,
  children,
  cover = false,
}: {
  brand: string;
  children: ReactNode;
  cover?: boolean;
}) {
  return (
    <Page size="A4" style={styles.page} wrap={false}>
      <View
        style={
          cover
            ? { minHeight: PDF_A4_HEIGHT - PDF_PAGE_MARGIN - PDF_PAGE_BOTTOM }
            : styles.contentArea
        }
        wrap={false}
      >
        {children}
      </View>
      <PageFooter brand={brand} />
    </Page>
  );
}

function CoverProjectRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: unknown;
  highlight?: boolean;
}) {
  return (
    <View style={styles.projectBlockRow} wrap={false}>
      <Text style={styles.projectBlockLabel} hyphenationCallback={noHyphenation}>
        {label}
      </Text>
      <Text
        style={
          highlight ? styles.projectBlockValueHighlight : styles.projectBlockValue
        }
        hyphenationCallback={noHyphenation}
      >
        {highlight
          ? safeText(value, "Untitled Project", 300)
          : label.startsWith("Generated")
            ? formatProductionPackGeneratedAt(value)
            : safeText(value)}
      </Text>
    </View>
  );
}

function SnapshotPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.snapshotPill} wrap={false}>
      <Text style={styles.snapshotPillLabel}>{label}</Text>
      <Text style={styles.snapshotPillValue}>{String(safeCount(value))}</Text>
    </View>
  );
}

function TocGrid({ items }: { items: Array<{ id: string; title: string }> }) {
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);
  return (
    <View style={styles.tocBox} wrap={false}>
      <Text style={styles.tocHeading}>Contents</Text>
      <View style={styles.tocColumns} wrap={false}>
        <View style={styles.tocCol} wrap={false}>
          {left.map((item, i) => (
            <Text key={`toc-l-${item.id}-${i}`} style={styles.tocItem}>
              {safeText(item.title)}
            </Text>
          ))}
        </View>
        <View style={styles.tocCol} wrap={false}>
          {right.map((item, i) => (
            <Text key={`toc-r-${item.id}-${i}`} style={styles.tocItem}>
              {safeText(item.title)}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function SceneCard({
  scene,
}: {
  scene: NonNullable<ProductionPackPdfData["scenes"]>[number];
}) {
  return (
    <View style={styles.sceneCard} wrap={false}>
      <Text
        style={{ fontFamily: "Helvetica-Bold", marginBottom: 4, fontSize: 8.5 }}
        hyphenationCallback={noHyphenation}
      >
        Scene {safeText(scene.sceneNumber)} · {safeText(scene.intExt)} ·{" "}
        {safeText(scene.dayNight)}
      </Text>
      <FieldRow label="Location" value={truncateForPdf(scene.location, 120)} />
      <FieldRow label="Summary" value={truncateForPdf(scene.summary, 160)} />
      <FieldRow
        label="Characters"
        value={truncateForPdf(scene.characters, 120)}
      />
      <FieldRow label="Elements" value={truncateForPdf(scene.elements, 100)} />
      <FieldRow label="Notes" value={truncateForPdf(scene.notes, 100)} />
    </View>
  );
}

function SafeText({
  children,
  style,
}: {
  children: unknown;
  style?: Styles[keyof Styles] | Styles[keyof Styles][];
}) {
  return (
    <Text style={style} hyphenationCallback={noHyphenation}>
      {safeText(children)}
    </Text>
  );
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  return (
    <View style={styles.row} wrap={false}>
      <Text style={styles.label} hyphenationCallback={noHyphenation}>
        {safeText(label)}
      </Text>
      <Text style={styles.value} hyphenationCallback={noHyphenation}>
        {safeText(value)}
      </Text>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <SafeText style={styles.empty}>{text}</SafeText>;
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View wrap={false}>
      <Text style={styles.sectionTitle} hyphenationCallback={noHyphenation}>
        {safeText(title)}
      </Text>
      {children}
    </View>
  );
}

function SectionUnavailable({ name }: { name: string }) {
  return (
    <Text style={styles.unavailable} hyphenationCallback={noHyphenation}>
      Section unavailable: {safeText(name)}
    </Text>
  );
}

function BulletList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items.length) return <Empty text={emptyText} />;
  return (
    <View wrap={false}>
      {items.map((item, i) => (
        <Text
          key={`bullet-${i}`}
          style={{ marginBottom: 4 }}
          hyphenationCallback={noHyphenation}
        >
          - {safeText(item, "—", 500)}
        </Text>
      ))}
    </View>
  );
}

function renderSection<T>(
  name: string,
  fn: () => ReactNode
): ReactNode {
  try {
    return fn();
  } catch (error) {
    console.error(`[FilmOps] Production pack section render failed: ${name}`, {
      section: name,
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return <SectionUnavailable name={name} />;
  }
}

export function ProductionPackPDF({
  data,
}: {
  data: ProductionPackPdfData;
}): ReactElement<DocumentProps> {
  const brand = safeText(data.brand, "Systemlix FilmOps");
  const projectTitle = safeText(data.projectTitle, "Untitled Project");

  const snapshot = data.snapshot ?? {
    sceneCount: 0,
    locationCount: 0,
    callSheetCount: 0,
    documentCount: 0,
    reportCount: 0,
    shootingDayCount: 0,
  };
  const tocOnCover = data.toc.length <= 8 ? data.toc : data.toc.slice(0, 8);
  const tocOverflow = data.toc.length > 8 ? data.toc.slice(8) : [];

  return (
    <Document>
      <PackPage brand={brand} cover>
        <View style={styles.coverAccentBar} />
        <Text style={styles.coverHeader} hyphenationCallback={noHyphenation}>
          SYSTEMLIX FILMOPS
        </Text>
        <Text style={styles.coverMainTitle} hyphenationCallback={noHyphenation}>
          PRODUCTION PACK
        </Text>
        <Text style={styles.coverSubtitle} hyphenationCallback={noHyphenation}>
          Complete project dossier for production planning
        </Text>

        <View style={styles.projectBlock} wrap={false}>
          <CoverProjectRow
            label="Project:"
            value={projectTitle}
            highlight
          />
          <CoverProjectRow label="Company:" value={data.companyName} />
          <CoverProjectRow label="Workspace:" value={data.workspaceName} />
          <CoverProjectRow
            label="Generated:"
            value={formatProductionPackGeneratedAt(data.generatedAt)}
          />
        </View>

        <Text style={styles.snapshotTitle}>Project Snapshot</Text>
        <View style={styles.snapshotGrid} wrap={false}>
          <SnapshotPill label="Scenes" value={snapshot.sceneCount} />
          <SnapshotPill label="Locations" value={snapshot.locationCount} />
          <SnapshotPill label="Call Sheets" value={snapshot.callSheetCount} />
          <SnapshotPill label="Documents" value={snapshot.documentCount} />
          <SnapshotPill label="Reports" value={snapshot.reportCount} />
          <SnapshotPill
            label="Shooting Days"
            value={snapshot.shootingDayCount}
          />
        </View>

        {tocOnCover.length > 0 && <TocGrid items={tocOnCover} />}
      </PackPage>

      {tocOverflow.length > 0 && (
        <PackPage brand={brand} cover>
          <Text style={styles.snapshotTitle}>Contents (continued)</Text>
          <TocGrid items={tocOverflow} />
        </PackPage>
      )}

      {data.overview &&
        renderSection("Project Overview", () => (
          <PackPage brand={brand}>
            <SectionBlock title="1 — Project Overview">
              <FieldRow label="Project title" value={projectTitle} />
              <FieldRow label="Company" value={data.companyName} />
              <FieldRow label="Workspace" value={data.workspaceName} />
              <FieldRow label="Status" value={data.overview!.status} />
              <FieldRow label="Created" value={data.overview!.createdAt} />
              <FieldRow
                label="Scenes"
                value={String(safeCount(data.overview!.sceneCount))}
              />
              <FieldRow
                label="Locations"
                value={String(safeCount(data.overview!.locationCount))}
              />
              <FieldRow
                label="Call sheets"
                value={String(safeCount(data.overview!.callSheetCount))}
              />
              <FieldRow
                label="Documents"
                value={String(safeCount(data.overview!.documentCount))}
              />
              <FieldRow
                label="Production reports"
                value={String(safeCount(data.overview!.reportCount))}
              />
              <View style={[styles.noteBox, { marginTop: 8 }]} wrap={false}>
                <Text
                  style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}
                  hyphenationCallback={noHyphenation}
                >
                  Operational summary
                </Text>
                <SafeText>{data.overview!.operationalSummary}</SafeText>
              </View>
            </SectionBlock>
          </PackPage>
        ))}

      {data.scenes !== undefined &&
        renderSection("Scenes", () => {
          if (data.scenes!.length === 0) {
            return (
              <PackPage brand={brand}>
                <SectionBlock title="2 — Scenes">
                  <Empty text="No scenes recorded in this project." />
                </SectionBlock>
              </PackPage>
            );
          }
          return (
            <>
              {chunkArray(data.scenes!, SCENES_PER_PAGE).map((chunk, pageIdx) => (
                <PackPage key={`scenes-page-${pageIdx}`} brand={brand}>
                  <SectionBlock
                    title={
                      pageIdx === 0
                        ? "2 — Scenes"
                        : `2 — Scenes (continued ${pageIdx + 1})`
                    }
                  >
                    {chunk.map((scene, i) => (
                      <SceneCard
                        key={`scene-${pageIdx}-${i}`}
                        scene={scene}
                      />
                    ))}
                  </SectionBlock>
                </PackPage>
              ))}
            </>
          );
        })}

      {data.cast !== undefined &&
        renderSection("Cast & Characters", () => {
          const colChar = safePercentWidth(0.28);
          const colActor = safePercentWidth(0.32);
          const colScenes = safePercentWidth(0.12);
          const colNotes = safePercentWidth(0.28);

          if (data.cast!.length === 0) {
            return (
              <PackPage brand={brand}>
                <SectionBlock title="3 — Cast & Characters">
                  <Empty text="No characters found in scene breakdown." />
                </SectionBlock>
              </PackPage>
            );
          }

          return (
            <>
              {chunkArray(data.cast!, CAST_PER_PAGE).map((chunk, pageIdx) => (
                <PackPage key={`cast-page-${pageIdx}`} brand={brand}>
                  <SectionBlock
                    title={
                      pageIdx === 0
                        ? "3 — Cast & Characters"
                        : `3 — Cast & Characters (continued ${pageIdx + 1})`
                    }
                  >
                    <View style={styles.tableHeader} wrap={false}>
                      <Text style={[styles.cell, { width: colChar }]}>
                        Character
                      </Text>
                      <Text style={[styles.cell, { width: colActor }]}>
                        Actor
                      </Text>
                      <Text style={[styles.cell, { width: colScenes }]}>
                        Scenes
                      </Text>
                      <Text style={[styles.cell, { width: colNotes }]}>
                        Notes
                      </Text>
                    </View>
                    {chunk.map((row, i) => (
                      <View
                        key={`cast-${pageIdx}-${i}`}
                        style={[
                          styles.tableRow,
                          i % 2 === 1
                            ? { backgroundColor: COLORS.rowAlt }
                            : {},
                        ]}
                        wrap={false}
                      >
                        <Text
                          style={[styles.cell, { width: colChar }]}
                          hyphenationCallback={noHyphenation}
                        >
                          {safeText(row.character)}
                        </Text>
                        <Text
                          style={[styles.cell, { width: colActor }]}
                          hyphenationCallback={noHyphenation}
                        >
                          {safeText(row.actor)}
                        </Text>
                        <Text
                          style={[styles.cell, { width: colScenes }]}
                          hyphenationCallback={noHyphenation}
                        >
                          {String(safeCount(row.sceneCount))}
                        </Text>
                        <Text
                          style={[styles.cell, { width: colNotes }]}
                          hyphenationCallback={noHyphenation}
                        >
                          {safeText(row.notes)}
                        </Text>
                      </View>
                    ))}
                  </SectionBlock>
                </PackPage>
              ))}
            </>
          );
        })}

      {data.locations !== undefined &&
        renderSection("Locations", () => {
          if (data.locations!.length === 0) {
            return (
              <PackPage brand={brand}>
                <SectionBlock title="4 — Locations">
                  <Empty text="No locations saved." />
                </SectionBlock>
              </PackPage>
            );
          }
          return (
            <>
              {chunkArray(data.locations!, LOCATIONS_PER_PAGE).map(
                (chunk, pageIdx) => (
                  <PackPage key={`loc-page-${pageIdx}`} brand={brand}>
                    <SectionBlock
                      title={
                        pageIdx === 0
                          ? "4 — Locations"
                          : `4 — Locations (continued ${pageIdx + 1})`
                      }
                    >
                      {chunk.map((loc, i) => (
                        <View
                          key={`loc-${pageIdx}-${i}`}
                          style={styles.noteBox}
                          wrap={false}
                        >
                          <Text
                            style={{
                              fontFamily: "Helvetica-Bold",
                              marginBottom: 4,
                            }}
                            hyphenationCallback={noHyphenation}
                          >
                            {safeText(loc.name)}
                          </Text>
                          <FieldRow label="Status" value={loc.status} />
                          <FieldRow label="Permit" value={loc.permitStatus} />
                          <FieldRow
                            label="Linked scenes"
                            value={loc.linkedScenes}
                          />
                          <FieldRow label="Address" value={loc.address} />
                          {safeText(loc.warning) !== "—" && (
                            <Text
                              style={{ color: COLORS.mid, marginTop: 4 }}
                              hyphenationCallback={noHyphenation}
                            >
                              Warning: {safeText(loc.warning)}
                            </Text>
                          )}
                        </View>
                      ))}
                    </SectionBlock>
                  </PackPage>
                )
              )}
            </>
          );
        })}

      {data.shootingDays !== undefined &&
        renderSection("Shooting Days", () => {
          if (data.shootingDays!.length === 0) {
            return (
              <PackPage brand={brand}>
                <SectionBlock title="5 — Shooting Days">
                  <Empty text="No shooting days planned." />
                </SectionBlock>
              </PackPage>
            );
          }
          return (
            <>
              {chunkArray(data.shootingDays!, DAYS_PER_PAGE).map(
                (chunk, pageIdx) => (
                  <PackPage key={`days-page-${pageIdx}`} brand={brand}>
                    <SectionBlock
                      title={
                        pageIdx === 0
                          ? "5 — Shooting Days"
                          : `5 — Shooting Days (continued ${pageIdx + 1})`
                      }
                    >
                      {chunk.map((day, i) => (
                        <View
                          key={`day-${pageIdx}-${i}`}
                          style={styles.noteBox}
                          wrap={false}
                        >
                          <Text
                            style={{
                              fontFamily: "Helvetica-Bold",
                              marginBottom: 4,
                            }}
                            hyphenationCallback={noHyphenation}
                          >
                            {safeText(day.label)} · {safeText(day.date)}
                          </Text>
                          <FieldRow
                            label="Planned scenes"
                            value={day.plannedScenes}
                          />
                          <FieldRow label="Location" value={day.location} />
                          <FieldRow
                            label="Call sheet"
                            value={day.linkedCallSheet}
                          />
                          <FieldRow label="Notes" value={day.notes} />
                        </View>
                      ))}
                    </SectionBlock>
                  </PackPage>
                )
              )}
            </>
          );
        })}

      {data.callSheets !== undefined &&
        renderSection("Call Sheets Summary", () => {
          if (data.callSheets!.length === 0) {
            return (
              <PackPage brand={brand}>
                <SectionBlock title="6 — Call Sheets Summary">
                  <Empty text="No call sheets created." />
                </SectionBlock>
              </PackPage>
            );
          }
          return (
            <>
              {chunkArray(data.callSheets!, SHEETS_PER_PAGE).map(
                (chunk, pageIdx) => (
                  <PackPage key={`sheets-page-${pageIdx}`} brand={brand}>
                    <SectionBlock
                      title={
                        pageIdx === 0
                          ? "6 — Call Sheets Summary"
                          : `6 — Call Sheets Summary (continued ${pageIdx + 1})`
                      }
                    >
                      {chunk.map((sheet, i) => (
                        <View
                          key={`sheet-${pageIdx}-${i}`}
                          style={styles.noteBox}
                          wrap={false}
                        >
                          <Text
                            style={{
                              fontFamily: "Helvetica-Bold",
                              marginBottom: 4,
                            }}
                            hyphenationCallback={noHyphenation}
                          >
                            {safeText(sheet.label)} · {safeText(sheet.date)} ·{" "}
                            {safeText(sheet.status)}
                          </Text>
                          <FieldRow label="Crew call" value={sheet.crewCall} />
                          <FieldRow label="First shot" value={sheet.firstShot} />
                          <FieldRow label="Wrap" value={sheet.wrap} />
                          <FieldRow
                            label="Scenes"
                            value={String(safeCount(sheet.sceneCount))}
                          />
                          <FieldRow label="Linked PDF" value={sheet.linkedPdf} />
                          {safeText(sheet.warnings) !== "—" && (
                            <Text
                              style={{ color: COLORS.mid, marginTop: 4 }}
                              hyphenationCallback={noHyphenation}
                            >
                              Warning: {safeText(sheet.warnings)}
                            </Text>
                          )}
                        </View>
                      ))}
                    </SectionBlock>
                  </PackPage>
                )
              )}
            </>
          );
        })}

      {data.documents !== undefined &&
        renderSection("Documents Index", () => {
          const colFile = safePercentWidth(0.3);
          const colCat = safePercentWidth(0.18);
          const colDept = safePercentWidth(0.16);
          const colDate = safePercentWidth(0.14);
          const colNotes = safePercentWidth(0.22);

          if (data.documents!.length === 0) {
            return (
              <PackPage brand={brand}>
                <SectionBlock title="7 — Documents Index">
                  <Empty text="No documents uploaded. Important permits and contracts may be missing." />
                </SectionBlock>
              </PackPage>
            );
          }
          return (
            <>
              {chunkArray(data.documents!, DOCS_PER_PAGE).map(
                (chunk, pageIdx) => (
                  <PackPage key={`docs-page-${pageIdx}`} brand={brand}>
                    <SectionBlock
                      title={
                        pageIdx === 0
                          ? "7 — Documents Index"
                          : `7 — Documents Index (continued ${pageIdx + 1})`
                      }
                    >
                      <View style={styles.tableHeader} wrap={false}>
                        <Text style={[styles.cell, { width: colFile }]}>
                          File
                        </Text>
                        <Text style={[styles.cell, { width: colCat }]}>
                          Category
                        </Text>
                        <Text style={[styles.cell, { width: colDept }]}>
                          Dept
                        </Text>
                        <Text style={[styles.cell, { width: colDate }]}>
                          Uploaded
                        </Text>
                        <Text style={[styles.cell, { width: colNotes }]}>
                          Notes
                        </Text>
                      </View>
                      {chunk.map((doc, i) => (
                        <View
                          key={`doc-${pageIdx}-${i}`}
                          style={[
                            styles.tableRow,
                            i % 2 === 1
                              ? { backgroundColor: COLORS.rowAlt }
                              : {},
                          ]}
                          wrap={false}
                        >
                          <Text
                            style={[styles.cell, { width: colFile }]}
                            hyphenationCallback={noHyphenation}
                          >
                            {safeText(doc.fileName)}
                          </Text>
                          <Text
                            style={[styles.cell, { width: colCat }]}
                            hyphenationCallback={noHyphenation}
                          >
                            {safeText(doc.category)}
                          </Text>
                          <Text
                            style={[styles.cell, { width: colDept }]}
                            hyphenationCallback={noHyphenation}
                          >
                            {safeText(doc.department)}
                          </Text>
                          <Text
                            style={[styles.cell, { width: colDate }]}
                            hyphenationCallback={noHyphenation}
                          >
                            {safeText(doc.uploadedAt)}
                          </Text>
                          <Text
                            style={[styles.cell, { width: colNotes }]}
                            hyphenationCallback={noHyphenation}
                          >
                            {safeText(doc.notes)}
                          </Text>
                        </View>
                      ))}
                    </SectionBlock>
                  </PackPage>
                )
              )}
            </>
          );
        })}

      {data.reports !== undefined &&
        renderSection("Production Reports", () => {
          if (data.reports!.length === 0) {
            return (
              <PackPage brand={brand}>
                <SectionBlock title="8 — Production Reports">
                  <Empty text="No production reports submitted." />
                </SectionBlock>
              </PackPage>
            );
          }
          return (
            <>
              {chunkArray(data.reports!, REPORTS_PER_PAGE).map(
                (chunk, pageIdx) => (
                  <PackPage key={`reports-page-${pageIdx}`} brand={brand}>
                    <SectionBlock
                      title={
                        pageIdx === 0
                          ? "8 — Production Reports"
                          : `8 — Production Reports (continued ${pageIdx + 1})`
                      }
                    >
                      {chunk.map((report, i) => (
                        <View
                          key={`report-${pageIdx}-${i}`}
                          style={styles.noteBox}
                          wrap={false}
                        >
                          <Text
                            style={{
                              fontFamily: "Helvetica-Bold",
                              marginBottom: 4,
                            }}
                            hyphenationCallback={noHyphenation}
                          >
                            {safeText(report.label)} · {safeText(report.status)}
                          </Text>
                          <FieldRow
                            label="Scenes completed"
                            value={report.scenesCompleted}
                          />
                          <FieldRow label="Issues" value={report.issues} />
                          <FieldRow
                            label="Department notes"
                            value={report.departmentNotes}
                          />
                          <FieldRow label="Approval" value={report.approval} />
                        </View>
                      ))}
                    </SectionBlock>
                  </PackPage>
                )
              )}
            </>
          );
        })}

      {data.departmentNotes !== undefined &&
        renderSection("Department Notes", () => {
          if (data.departmentNotes!.length === 0) {
            return (
              <PackPage brand={brand}>
                <SectionBlock title="9 — Department Notes">
                  <Empty text="No department notes in production reports." />
                </SectionBlock>
              </PackPage>
            );
          }
          return (
            <>
              {chunkArray(data.departmentNotes!, DEPT_NOTES_PER_PAGE).map(
                (chunk, pageIdx) => (
                  <PackPage key={`dept-page-${pageIdx}`} brand={brand}>
                    <SectionBlock
                      title={
                        pageIdx === 0
                          ? "9 — Department Notes"
                          : `9 — Department Notes (continued ${pageIdx + 1})`
                      }
                    >
                      {chunk.map((note, i) => (
                        <View
                          key={`dept-${pageIdx}-${i}`}
                          style={styles.noteBox}
                          wrap={false}
                        >
                          <Text
                            style={{
                              fontFamily: "Helvetica-Bold",
                              marginBottom: 4,
                            }}
                            hyphenationCallback={noHyphenation}
                          >
                            {safeText(note.department)} ·{" "}
                            {safeText(note.reportLabel)}
                          </Text>
                          <SafeText>{note.notes}</SafeText>
                        </View>
                      ))}
                    </SectionBlock>
                  </PackPage>
                )
              )}
            </>
          );
        })}

      {data.intelligence &&
        renderSection("Production Intelligence Check", () => (
          <PackPage brand={brand}>
            <SectionBlock title="10 — Production Intelligence Check">
              <View style={styles.scoreBox} wrap={false}>
                <Text style={styles.scoreValue} hyphenationCallback={noHyphenation}>
                  {String(safeScore(data.intelligence!.healthScore))}
                </Text>
                <Text
                  style={{ color: COLORS.mid, marginTop: 4 }}
                  hyphenationCallback={noHyphenation}
                >
                  Production health score / 100
                </Text>
              </View>
              <Text style={styles.subsection}>Critical issues</Text>
              <BulletList
                items={data.intelligence!.critical}
                emptyText="No critical issues detected."
              />
              <Text style={styles.subsection}>Warnings</Text>
              <BulletList
                items={data.intelligence!.warnings}
                emptyText="No warnings detected."
              />
              <Text style={styles.subsection}>Info / missing data</Text>
              <BulletList
                items={data.intelligence!.info}
                emptyText="No additional info items."
              />
              <Text style={styles.subsection}>Suggested next actions</Text>
              <BulletList
                items={data.intelligence!.suggestedActions}
                emptyText="No actions suggested."
              />
            </SectionBlock>
          </PackPage>
        ))}
    </Document>
  );
}
