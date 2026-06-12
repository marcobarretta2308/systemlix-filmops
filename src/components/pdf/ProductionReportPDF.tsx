import {
  dash,
  type ProductionReportPdfData,
} from "@/lib/pdf/production-report-types";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
} from "@react-pdf/renderer";
import type { ReactElement, ReactNode } from "react";

const COLORS = {
  black: "#141414",
  mid: "#4a4a4a",
  muted: "#8a8a8a",
  line: "#e2e2e2",
  band: "#f6f6f6",
  headerBg: "#f0f0f0",
  rowAlt: "#fafafa",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: COLORS.black,
    padding: 32,
    lineHeight: 1.35,
  },
  brand: {
    fontSize: 6.5,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  meta: { fontSize: 8, color: COLORS.mid, marginBottom: 2 },
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: COLORS.mid,
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  row: { flexDirection: "row", gap: 8, marginBottom: 4 },
  label: { width: "32%", color: COLORS.muted, fontSize: 7.5 },
  value: { flex: 1, fontSize: 8 },
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
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 6.5,
    color: COLORS.muted,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.line,
    paddingTop: 6,
  },
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function ProductionReportPDF({
  data,
}: {
  data: ProductionReportPdfData;
}): ReactElement<DocumentProps> {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>{data.brand}</Text>
        <Text style={styles.title}>{data.reportTitle}</Text>
        <Text style={styles.meta}>{data.projectTitle}</Text>
        <Text style={styles.meta}>{data.productionName}</Text>
        <Text style={styles.meta}>
          Report date: {data.reportDate} · Status: {data.statusLabel}
        </Text>
        <Text style={styles.meta}>
          Shooting day: {data.shootingDayLabel} · Call sheet: {data.callSheetLabel}
        </Text>

        <Section title="Actual timings">
          <FieldRow label="Crew call" value={data.actualCrewCallTime} />
          <FieldRow label="First shot" value={data.actualFirstShotTime} />
          <FieldRow label="Wrap" value={data.actualWrapTime} />
          <FieldRow label="Meal break" value={data.mealBreakTime} />
          <FieldRow label="Total shooting hours" value={data.totalShootingHours} />
        </Section>

        {(data.overtimeNotes !== "—" || data.weatherNotes !== "—" || data.generalNotes !== "—") && (
          <Section title="Production notes">
            {data.overtimeNotes !== "—" && (
              <View style={styles.noteBox}>
                <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>Overtime</Text>
                <Text>{data.overtimeNotes}</Text>
              </View>
            )}
            {data.weatherNotes !== "—" && (
              <View style={styles.noteBox}>
                <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>Weather</Text>
                <Text>{data.weatherNotes}</Text>
              </View>
            )}
            {data.generalNotes !== "—" && (
              <View style={styles.noteBox}>
                <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>General</Text>
                <Text>{data.generalNotes}</Text>
              </View>
            )}
          </Section>
        )}

        {data.scenes.length > 0 && (
          <Section title="Scene status">
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, { width: "15%" }]}>Scene</Text>
              <Text style={[styles.cell, { width: "25%" }]}>Status</Text>
              <Text style={[styles.cell, { width: "60%" }]}>Notes</Text>
            </View>
            {data.scenes.map((s, i) => (
              <View
                key={`${s.sceneNumber}-${i}`}
                style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: COLORS.rowAlt } : {}]}
              >
                <Text style={[styles.cell, { width: "15%" }]}>{s.sceneNumber}</Text>
                <Text style={[styles.cell, { width: "25%" }]}>{s.statusLabel}</Text>
                <Text style={[styles.cell, { width: "60%" }]}>{s.notes}</Text>
              </View>
            ))}
          </Section>
        )}

        {data.issues.length > 0 && (
          <Section title="Issues & problems">
            {data.issues.map((issue, i) => (
              <View key={`${issue.title}-${i}`} style={styles.noteBox}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  {issue.title} · {issue.severityLabel}
                  {issue.resolved ? " · Resolved" : ""}
                </Text>
                <Text style={{ color: COLORS.mid, marginTop: 2 }}>
                  {issue.categoryLabel}
                  {issue.department !== "—" ? ` · ${issue.department}` : ""}
                </Text>
                {issue.description !== "—" && (
                  <Text style={{ marginTop: 3 }}>{issue.description}</Text>
                )}
                {issue.notes !== "—" && (
                  <Text style={{ marginTop: 2, color: COLORS.mid }}>{issue.notes}</Text>
                )}
              </View>
            ))}
          </Section>
        )}

        {data.departmentNotes.length > 0 && (
          <Section title="Department notes">
            {data.departmentNotes.map((n) => (
              <View key={n.department} style={styles.noteBox}>
                <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>
                  {n.department}
                </Text>
                <Text>{n.notes}</Text>
              </View>
            ))}
          </Section>
        )}

        <Section title="Approval">
          <FieldRow label="Created by" value={dash(data.createdBy)} />
          <FieldRow label="Submitted by" value={dash(data.submittedBy)} />
          <FieldRow label="Submitted at" value={data.submittedAt} />
          <FieldRow label="Approved by" value={dash(data.approvedBy)} />
          <FieldRow label="Approved at" value={data.approvedAt} />
        </Section>

        <Text style={styles.footer}>
          FilmOps · Production Report · Generated {data.generatedAt}
        </Text>
      </Page>
    </Document>
  );
}
