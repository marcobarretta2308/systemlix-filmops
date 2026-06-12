import {
  dash,
  formatPdfDate,
  type CallSheetPdfData,
} from "@/lib/pdf/call-sheet-types";
import {
  formatEmergencyContacts,
  formatMapsDisplay,
  getScheduleTime,
  normalizeCallSheetPdfData,
  sceneColumnWidth,
} from "@/lib/pdf/call-sheet-pdf-helpers";
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

const PAGE_PADDING = 32;
const PAGE_BOTTOM = 40;

const COLORS = {
  black: "#141414",
  dark: "#2a2a2a",
  mid: "#4a4a4a",
  muted: "#8a8a8a",
  line: "#e2e2e2",
  lineLight: "#efefef",
  band: "#f6f6f6",
  headerBg: "#f0f0f0",
  rowAlt: "#fafafa",
  noteBg: "#f8f8f8",
};

const noHyphenation = (word: string) => [word];

const sceneCols = {
  scene: sceneColumnWidth(0.06),
  ie: sceneColumnWidth(0.06),
  dn: sceneColumnWidth(0.06),
  location: sceneColumnWidth(0.16),
  description: sceneColumnWidth(0.28),
  characters: sceneColumnWidth(0.18),
  props: sceneColumnWidth(0.14),
  complexity: sceneColumnWidth(0.06),
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: COLORS.black,
    paddingTop: PAGE_PADDING,
    paddingBottom: PAGE_BOTTOM + 18,
    paddingHorizontal: PAGE_PADDING,
    lineHeight: 1.35,
  },
  header: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },
  headerLeft: {
    flex: 1,
    maxWidth: "58%",
  },
  headerRight: {
    width: "38%",
    alignItems: "flex-end",
  },
  brand: {
    fontSize: 6.5,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  projectTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    marginBottom: 3,
    lineHeight: 1.12,
  },
  productionMeta: {
    fontSize: 8,
    color: COLORS.mid,
    lineHeight: 1.25,
  },
  callSheetTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.black,
    marginBottom: 5,
    textAlign: "right",
  },
  dayNumber: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
    marginBottom: 2,
    textAlign: "right",
  },
  headerDate: {
    fontSize: 8,
    color: COLORS.mid,
    marginBottom: 3,
    textAlign: "right",
    lineHeight: 1.3,
  },
  versionStatus: {
    fontSize: 7.5,
    color: COLORS.muted,
    textAlign: "right",
  },
  summaryBand: {
    flexDirection: "row",
    backgroundColor: COLORS.band,
    borderWidth: 0.5,
    borderColor: COLORS.line,
    marginBottom: 8,
  },
  summaryCol: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.line,
  },
  summaryColLast: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  summaryLabel: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: COLORS.muted,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
    lineHeight: 1.25,
  },
  section: {
    marginBottom: 7,
  },
  sectionTitle: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    color: COLORS.muted,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.lineLight,
  },
  infoGrid: {
    borderWidth: 0.5,
    borderColor: COLORS.lineLight,
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.lineLight,
    minHeight: 13,
  },
  infoRowLast: {
    flexDirection: "row",
    minHeight: 13,
  },
  infoLabel: {
    width: 100,
    paddingVertical: 2,
    paddingHorizontal: 5,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.mid,
    backgroundColor: COLORS.band,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.lineLight,
  },
  infoValue: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 5,
    fontSize: 7,
    color: COLORS.black,
    lineHeight: 1.3,
  },
  scheduleTable: {
    borderWidth: 0.5,
    borderColor: COLORS.line,
  },
  scheduleHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  scheduleHeaderTime: {
    width: 56,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
    textTransform: "uppercase",
  },
  scheduleHeaderActivity: {
    flex: 1,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
    textTransform: "uppercase",
  },
  scheduleRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.lineLight,
    paddingVertical: 3,
    paddingHorizontal: 5,
    minHeight: 14,
  },
  scheduleRowLast: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 5,
    minHeight: 14,
  },
  scheduleTime: {
    width: 56,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
  },
  scheduleActivity: {
    flex: 1,
    fontSize: 7,
    color: COLORS.dark,
  },
  table: {
    borderWidth: 0.5,
    borderColor: COLORS.line,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.lineLight,
    alignItems: "flex-start",
    minHeight: 20,
  },
  tableRowAlt: {
    backgroundColor: COLORS.rowAlt,
  },
  tableCell: {
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  tableCellDesc: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    paddingLeft: 6,
  },
  tableCellTight: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  cellText: {
    fontSize: 6.5,
    color: COLORS.black,
    lineHeight: 1.35,
  },
  cellTextBold: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    lineHeight: 1.35,
  },
  headerCellText: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  sceneColScene: { width: sceneCols.scene },
  sceneColIE: { width: sceneCols.ie },
  sceneColDN: { width: sceneCols.dn },
  sceneColLocation: { width: sceneCols.location },
  sceneColDesc: { width: sceneCols.description },
  sceneColChars: { width: sceneCols.characters },
  sceneColProps: { width: sceneCols.props },
  sceneColCompl: { width: sceneCols.complexity },
  castColName: { flex: 1.15, minWidth: 68 },
  castColRole: { flex: 1, minWidth: 54 },
  castColDept: { flex: 0.85, minWidth: 48 },
  castColCall: { width: 38 },
  castColStatus: { width: 44 },
  notesRow: {
    flexDirection: "row",
  },
  noteBox: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: COLORS.lineLight,
    backgroundColor: COLORS.noteBg,
    paddingVertical: 5,
    paddingHorizontal: 6,
    minHeight: 36,
    marginRight: 5,
  },
  noteBoxLast: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: COLORS.lineLight,
    backgroundColor: COLORS.noteBg,
    paddingVertical: 5,
    paddingHorizontal: 6,
    minHeight: 36,
  },
  noteBoxLabel: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: COLORS.muted,
    marginBottom: 3,
  },
  noteBoxText: {
    fontSize: 7,
    color: COLORS.black,
    lineHeight: 1.3,
  },
  emptyText: {
    fontSize: 7,
    color: COLORS.muted,
    fontStyle: "italic",
    paddingVertical: 2,
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.lineLight,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 6,
    color: COLORS.muted,
  },
});

function Section({
  title,
  children,
  compact,
}: {
  title: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={compact ? { marginBottom: 6 } : styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} hyphenationCallback={noHyphenation}>
        {dash(value)}
      </Text>
    </>
  );
}

function TableHeaderCell({
  label,
  widthStyle,
  tight,
}: {
  label: string;
  widthStyle: Styles[keyof Styles];
  tight?: boolean;
}) {
  return (
    <View style={[widthStyle, tight ? styles.tableCellTight : styles.tableCell]}>
      <Text style={styles.headerCellText} hyphenationCallback={noHyphenation}>
        {label}
      </Text>
    </View>
  );
}

function TableDataCell({
  widthStyle,
  value,
  bold,
  desc,
  tight,
}: {
  widthStyle: Styles[keyof Styles];
  value: string;
  bold?: boolean;
  desc?: boolean;
  tight?: boolean;
}) {
  const cellStyle = desc
    ? styles.tableCellDesc
    : tight
      ? styles.tableCellTight
      : styles.tableCell;

  return (
    <View style={[widthStyle, cellStyle]}>
      <Text
        style={bold ? styles.cellTextBold : styles.cellText}
        hyphenationCallback={noHyphenation}
      >
        {dash(value)}
      </Text>
    </View>
  );
}

function SummaryColumn({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={last ? styles.summaryColLast : styles.summaryCol}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} hyphenationCallback={noHyphenation}>
        {dash(value)}
      </Text>
    </View>
  );
}

type CallSheetPDFProps = {
  data: CallSheetPdfData;
};

export function CallSheetPDF({
  data,
}: CallSheetPDFProps): ReactElement<DocumentProps> {
  const pdf = normalizeCallSheetPdfData(data);
  const crewCall = getScheduleTime(pdf.schedule, ["crew"]);
  const firstShot = getScheduleTime(pdf.schedule, ["ciak", "primo", "shot"]);
  const wrapTime = getScheduleTime(pdf.schedule, ["wrap"]);

  const dayFields = [
    { label: "Shooting Day", value: pdf.dayNumber },
    { label: "Data", value: formatPdfDate(pdf.date) },
    { label: "Location", value: pdf.locationName },
    { label: "Indirizzo", value: pdf.locationAddress },
    { label: "Maps", value: formatMapsDisplay(pdf.mapsLink) },
    { label: "Parcheggio", value: pdf.parkingNotes },
    { label: "Accesso", value: pdf.accessNotes },
    { label: "Note location", value: pdf.locationProductionNotes },
  ];

  return (
    <Document
      title={`Call Sheet ${pdf.projectTitle} ${pdf.dayNumber}`}
      author="FilmOps"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} wrap={false}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.brand}>FilmOps</Text>
              <Text style={styles.projectTitle}>{pdf.projectTitle}</Text>
              <Text style={styles.productionMeta}>
                {pdf.productionTitle} · {pdf.productionType}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.callSheetTitle}>Call Sheet</Text>
              <Text style={styles.dayNumber}>{pdf.dayNumber}</Text>
              <Text style={styles.headerDate}>{formatPdfDate(pdf.date)}</Text>
              <Text style={styles.versionStatus}>
                Versione v{pdf.version} · {pdf.statusLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryBand} wrap={false}>
          <SummaryColumn label="Location" value={pdf.locationName} />
          <SummaryColumn label="Crew Call" value={crewCall} />
          <SummaryColumn label="First Shot" value={firstShot} />
          <SummaryColumn label="Wrap" value={wrapTime} last />
        </View>

        <View wrap={false}>
          <Section title="Giornata di ripresa" compact>
            <View style={styles.infoGrid}>
              {dayFields.map((field, index) => (
                <View
                  key={field.label}
                  style={
                    index === dayFields.length - 1
                      ? styles.infoRowLast
                      : styles.infoRow
                  }
                >
                  <InfoField label={field.label} value={field.value} />
                </View>
              ))}
            </View>
          </Section>

          <Section title="Orari" compact>
            <View style={styles.scheduleTable}>
              <View style={styles.scheduleHeader}>
                <Text style={styles.scheduleHeaderTime}>Ora</Text>
                <Text style={styles.scheduleHeaderActivity}>Attività</Text>
              </View>
              {pdf.schedule.map((item, index) => (
                <View
                  key={`${item.label}-${index}`}
                  style={
                    index === pdf.schedule.length - 1
                      ? styles.scheduleRowLast
                      : styles.scheduleRow
                  }
                >
                  <Text style={styles.scheduleTime}>{item.time}</Text>
                  <Text style={styles.scheduleActivity}>{item.label}</Text>
                </View>
              ))}
            </View>
          </Section>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scene</Text>
          {pdf.scenes.length === 0 ? (
            <Text style={styles.emptyText}>—</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader} wrap={false}>
                <TableHeaderCell
                  label="Scena"
                  widthStyle={styles.sceneColScene}
                  tight
                />
                <TableHeaderCell label="I/E" widthStyle={styles.sceneColIE} tight />
                <TableHeaderCell label="D/N" widthStyle={styles.sceneColDN} tight />
                <TableHeaderCell
                  label="Location"
                  widthStyle={styles.sceneColLocation}
                />
                <TableHeaderCell
                  label="Descrizione"
                  widthStyle={styles.sceneColDesc}
                />
                <TableHeaderCell
                  label="Personaggi"
                  widthStyle={styles.sceneColChars}
                />
                <TableHeaderCell label="Props" widthStyle={styles.sceneColProps} />
                <TableHeaderCell
                  label="Compl."
                  widthStyle={styles.sceneColCompl}
                  tight
                />
              </View>
              {pdf.scenes.map((scene, index) => (
                <View
                  key={`${scene.scene_number}-${index}`}
                  style={[
                    styles.tableRow,
                    ...(index % 2 === 1 ? [styles.tableRowAlt] : []),
                  ]}
                >
                  <TableDataCell
                    widthStyle={styles.sceneColScene}
                    value={scene.scene_number}
                    bold
                    tight
                  />
                  <TableDataCell
                    widthStyle={styles.sceneColIE}
                    value={scene.int_ext}
                    tight
                  />
                  <TableDataCell
                    widthStyle={styles.sceneColDN}
                    value={scene.day_night}
                    tight
                  />
                  <TableDataCell
                    widthStyle={styles.sceneColLocation}
                    value={scene.location}
                  />
                  <TableDataCell
                    widthStyle={styles.sceneColDesc}
                    value={scene.short_description}
                    desc
                  />
                  <TableDataCell
                    widthStyle={styles.sceneColChars}
                    value={scene.characters}
                  />
                  <TableDataCell
                    widthStyle={styles.sceneColProps}
                    value={scene.props}
                  />
                  <TableDataCell
                    widthStyle={styles.sceneColCompl}
                    value={scene.complexity}
                    tight
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ marginBottom: 6 }}>
          <Text style={styles.sectionTitle}>Cast & Crew</Text>
          {pdf.castCrew.length === 0 ? (
            <Text style={styles.emptyText}>—</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader} wrap={false}>
                <TableHeaderCell label="Nome" widthStyle={styles.castColName} />
                <TableHeaderCell label="Ruolo" widthStyle={styles.castColRole} />
                <TableHeaderCell label="Reparto" widthStyle={styles.castColDept} />
                <TableHeaderCell
                  label="Call"
                  widthStyle={styles.castColCall}
                  tight
                />
                <TableHeaderCell
                  label="Stato"
                  widthStyle={styles.castColStatus}
                  tight
                />
              </View>
              {pdf.castCrew.map((member, index) => (
                <View
                  key={`${member.name}-${index}`}
                  style={[
                    styles.tableRow,
                    { minHeight: 16, paddingVertical: 0 },
                    ...(index % 2 === 1 ? [styles.tableRowAlt] : []),
                  ]}
                >
                  <TableDataCell
                    widthStyle={styles.castColName}
                    value={member.name}
                    bold
                  />
                  <TableDataCell
                    widthStyle={styles.castColRole}
                    value={member.role}
                  />
                  <TableDataCell
                    widthStyle={styles.castColDept}
                    value={member.department}
                  />
                  <TableDataCell
                    widthStyle={styles.castColCall}
                    value={member.call_time}
                    bold
                    tight
                  />
                  <TableDataCell
                    widthStyle={styles.castColStatus}
                    value={member.status}
                    tight
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ marginBottom: 4 }} wrap={false}>
          <Text style={styles.sectionTitle}>Note operative</Text>
          <View style={styles.notesRow}>
            <View style={styles.noteBox}>
              <Text style={styles.noteBoxLabel}>Trasporti</Text>
              <Text style={styles.noteBoxText} hyphenationCallback={noHyphenation}>
                {pdf.transportNotes}
              </Text>
            </View>
            <View style={styles.noteBox}>
              <Text style={styles.noteBoxLabel}>Note produzione</Text>
              <Text style={styles.noteBoxText} hyphenationCallback={noHyphenation}>
                {pdf.productionNotes}
              </Text>
            </View>
            <View style={styles.noteBoxLast}>
              <Text style={styles.noteBoxLabel}>Emergenza</Text>
              <Text style={styles.noteBoxText} hyphenationCallback={noHyphenation}>
                {formatEmergencyContacts(pdf.emergencyContacts)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            FilmOps · Call Sheet
          </Text>
          <Text style={styles.footerText}>Generato il {pdf.generatedAt}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} di ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
