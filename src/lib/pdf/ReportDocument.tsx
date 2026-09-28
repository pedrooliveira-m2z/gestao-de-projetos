import React from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Rect, Polygon, Line } from "@react-pdf/renderer";
import type { ProjectView, FrontView } from "@/lib/project-data";
import {
  nextOperationalDeadline,
  nextContractualDeadline,
  listOperationalAttention,
} from "@/lib/project-data";
import { STATUS_STYLE } from "@/lib/colors";
import { formatFullDate, formatShortDate, formatWeekday } from "@/lib/format";

const INK = "#0b0e14";
const BORDER = "#e5e7eb";
const MUTED = "#6b7280";

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 28,
    paddingHorizontal: 0,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#171717",
  },
  header: {
    backgroundColor: INK,
    color: "#ffffff",
    paddingHorizontal: 28,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerKicker: { fontSize: 8, letterSpacing: 1.5, color: "#9ca3af", textTransform: "uppercase" },
  headerTitle: { fontSize: 16, fontWeight: 700, marginTop: 3 },
  headerSubtitle: { fontSize: 8.5, color: "#d1d5db", marginTop: 3 },
  brand: { fontSize: 12, fontWeight: 700, letterSpacing: 1 },
  brandSub: { fontSize: 6.5, color: "#9ca3af", letterSpacing: 2, marginTop: 1 },
  body: { paddingHorizontal: 28, paddingTop: 16 },
  sectionKicker: { fontSize: 7.5, letterSpacing: 1.5, color: "#9ca3af", textTransform: "uppercase" },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginTop: 2, marginBottom: 8 },
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  kpiCard: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 8 },
  kpiLabel: { fontSize: 6.5, letterSpacing: 1, color: "#9ca3af", textTransform: "uppercase" },
  kpiValue: { fontSize: 14, fontWeight: 700, marginTop: 3 },
  kpiHint: { fontSize: 7, color: MUTED, marginTop: 2 },
  calloutRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  calloutOk: { flex: 1, borderRadius: 4, borderWidth: 1, borderColor: "#a7f3d0", backgroundColor: "#ecfdf5", padding: 8 },
  calloutBad: { flex: 1, borderRadius: 4, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2", padding: 8 },
  calloutTitleOk: { fontSize: 8.5, fontWeight: 700, color: "#047857" },
  calloutTitleBad: { fontSize: 8.5, fontWeight: 700, color: "#b91c1c" },
  calloutText: { fontSize: 7, color: "#374151", marginTop: 2, lineHeight: 1.4 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: "hidden" },
  tHeadRow: { flexDirection: "row", backgroundColor: INK },
  tHeadCell: { color: "#fff", fontSize: 7, fontWeight: 700, textTransform: "uppercase", padding: 6 },
  tRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER },
  tCell: { fontSize: 7.5, padding: 6, color: "#374151" },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  badgeText: { fontSize: 6.5, fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 10,
    left: 28,
    right: 28,
    fontSize: 6.5,
    color: "#9ca3af",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const colWidths = {
  frente: "30%",
  regra: "24%",
  data: "14%",
  situacao: "18%",
  leitura: "14%",
};

function Header({ view, kicker, title }: { view: ProjectView; kicker: string; title: string }) {
  return (
    <View style={styles.header} fixed>
      <View>
        <Text style={styles.headerKicker}>{kicker}</Text>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>
          Status atualizado com briefing em {formatFullDate(view.briefingDate)} e corte em{" "}
          {formatFullDate(view.cutoffDate)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.brand}>CATALISTI</Text>
        <Text style={styles.brandSub}>HOLDING</Text>
      </View>
    </View>
  );
}

function Footer({ note }: { note: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{note}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function StatusBadgePdf({ status, label }: { status: keyof typeof STATUS_STYLE; label: string }) {
  const style = STATUS_STYLE[status];
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.fg }]}>{label}</Text>
    </View>
  );
}

function ExecutiveSummaryPage({ view }: { view: ProjectView }) {
  const nextOperational = nextOperationalDeadline(view);
  const nextContractual = nextContractualDeadline(view);
  const attention = listOperationalAttention(view);
  const hasContractualDelay = attention.some((d) => d.status === "ATRASO_CONTRATUAL");

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <Header view={view} kicker="Painel geral de projetos" title={`${view.clientName} / ${view.name}`} />
      <View style={styles.body}>
        <Text style={styles.sectionKicker}>Visão executiva</Text>
        <Text style={styles.sectionTitle}>Prazo contratual x execução operacional</Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Briefing / referência</Text>
            <Text style={styles.kpiValue}>{formatShortDate(view.briefingDate)}</Text>
            <Text style={styles.kpiHint}>{formatWeekday(view.briefingDate)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Data de corte</Text>
            <Text style={styles.kpiValue}>{formatShortDate(view.cutoffDate)}</Text>
            <Text style={styles.kpiHint}>hoje</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Próximo prazo operacional</Text>
            <Text style={styles.kpiValue}>
              {nextOperational ? formatShortDate(nextOperational.ganttEnd) : "—"}
            </Text>
            <Text style={styles.kpiHint}>{nextOperational?.name ?? "—"}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Próximo prazo contratual</Text>
            <Text style={styles.kpiValue}>
              {nextContractual ? formatShortDate(nextContractual.deadline) : "—"}
            </Text>
            <Text style={styles.kpiHint}>{nextContractual?.name ?? "—"}</Text>
          </View>
        </View>

        <View style={styles.calloutRow}>
          <View style={hasContractualDelay ? styles.calloutBad : styles.calloutOk}>
            <Text style={hasContractualDelay ? styles.calloutTitleBad : styles.calloutTitleOk}>
              {hasContractualDelay
                ? "Atraso contratual identificado"
                : "Nenhum atraso contratual identificado"}
            </Text>
            <Text style={styles.calloutText}>
              {hasContractualDelay
                ? "Um ou mais prazos calculados a partir do briefing já venceram na data de corte."
                : "Os prazos máximos calculados a partir do briefing ainda não venceram na data de corte."}
            </Text>
          </View>
          <View style={attention.length > 0 ? styles.calloutBad : styles.calloutOk}>
            <Text style={attention.length > 0 ? styles.calloutTitleBad : styles.calloutTitleOk}>
              {attention.length > 0
                ? `${attention.length} atenção(ões) operacional(is) no ClickUp`
                : "Nenhuma atenção operacional no ClickUp"}
            </Text>
            {attention.slice(0, 2).map((d) => (
              <Text key={d.id} style={styles.calloutText}>
                "{d.name}" venceu em {formatShortDate(d.ganttEnd)} e segue como{" "}
                {d.situacaoClickup ?? "pendente"}.
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tHeadRow}>
            <Text style={[styles.tHeadCell, { width: colWidths.frente }]}>Frente / entrega</Text>
            <Text style={[styles.tHeadCell, { width: colWidths.regra }]}>Regra de prazo</Text>
            <Text style={[styles.tHeadCell, { width: colWidths.data }]}>Data limite</Text>
            <Text style={[styles.tHeadCell, { width: colWidths.situacao }]}>Situação no ClickUp</Text>
            <Text style={[styles.tHeadCell, { width: colWidths.leitura }]}>Leitura executiva</Text>
          </View>
          {view.fronts.flatMap((front) =>
            front.deliverables.map((d) => (
              <View key={d.id} style={styles.tRow}>
                <View style={[{ width: colWidths.frente, flexDirection: "row", alignItems: "center", padding: 6 }]}>
                  <View style={[styles.dot, { backgroundColor: d.colorHex }]} />
                  <Text style={{ fontSize: 7.5, color: "#374151" }}>
                    {front.name} — {d.name}
                  </Text>
                </View>
                <Text style={[styles.tCell, { width: colWidths.regra }]}>{d.ruleLabel ?? "—"}</Text>
                <Text style={[styles.tCell, { width: colWidths.data }]}>
                  {formatFullDate(d.deadline ?? d.ganttEnd)}
                  {d.isEstimated ? "*" : ""}
                </Text>
                <Text style={[styles.tCell, { width: colWidths.situacao }]}>
                  {d.situacaoClickup ?? "—"}
                </Text>
                <View style={{ width: colWidths.leitura, padding: 6 }}>
                  <StatusBadgePdf status={d.status} label={d.statusLabel} />
                </View>
              </View>
            ))
          )}
        </View>
      </View>
      <Footer note="Documento gerencial. Em caso de divergência, prevalece o contrato." />
    </Page>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

function ganttRange(fronts: FrontView[], cutoffDate: Date) {
  const dates = fronts
    .flatMap((f) => f.deliverables)
    .flatMap((d) => [d.ganttStart, d.approvalWindowStart, d.ganttEnd])
    .filter((d): d is Date => !!d);
  dates.push(cutoffDate);
  const start = new Date(Math.min(...dates.map((d) => d.getTime())) - 3 * DAY_MS);
  const end = new Date(Math.max(...dates.map((d) => d.getTime())) + 3 * DAY_MS);
  return { start, end };
}

function GanttPage({ view }: { view: ProjectView }) {
  const { start, end } = ganttRange(view.fronts, view.cutoffDate);
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / DAY_MS);

  const chartWidth = 700;
  const labelWidth = 170;
  const rowHeight = 15;
  const headerHeight = 16;

  const flatRows: Array<
    | { kind: "front"; front: FrontView }
    | { kind: "deliverable"; front: FrontView; deliverable: FrontView["deliverables"][number] }
  > = [];
  view.fronts.forEach((front) => {
    flatRows.push({ kind: "front", front });
    front.deliverables.forEach((deliverable) => flatRows.push({ kind: "deliverable", front, deliverable }));
  });

  const chartHeight = headerHeight + flatRows.length * rowHeight;
  const x = (d: Date) => ((d.getTime() - start.getTime()) / DAY_MS / totalDays) * chartWidth;

  const weekTicks: Date[] = [];
  for (let t = new Date(start); t <= end; t.setUTCDate(t.getUTCDate() + 7)) {
    weekTicks.push(new Date(t));
  }

  const todayX = x(view.cutoffDate);

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <Header view={view} kicker="Gantt atualizado" title={`${view.clientName} / ${view.name}`} />
      <View style={styles.body}>
        <Text style={styles.sectionKicker}>Produção, design e aprovações</Text>
        <Text style={styles.sectionTitle}>Calendário do projeto</Text>

        <Svg width={labelWidth + chartWidth} height={chartHeight + 10}>
          {/* header background */}
          <Rect x={0} y={0} width={labelWidth + chartWidth} height={headerHeight} fill={INK} />
          <Rect
            x={labelWidth}
            y={0}
            width={chartWidth}
            height={chartHeight}
            fill="#ffffff"
            stroke={BORDER}
          />
          {weekTicks.map((tick, i) => (
            <Line
              key={i}
              x1={labelWidth + x(tick)}
              y1={0}
              x2={labelWidth + x(tick)}
              y2={chartHeight}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
          ))}
          {/* today line */}
          <Line
            x1={labelWidth + todayX}
            y1={0}
            x2={labelWidth + todayX}
            y2={chartHeight}
            stroke="#dc2626"
            strokeWidth={1}
          />

          {flatRows.map((row, i) => {
            const y = headerHeight + i * rowHeight;
            if (row.kind === "front") {
              return (
                <Rect
                  key={i}
                  x={0}
                  y={y}
                  width={labelWidth + chartWidth}
                  height={rowHeight}
                  fill={row.front.colorHex}
                />
              );
            }
            const d = row.deliverable;
            const barY = y + rowHeight / 2 - 3.5;
            return (
              <React.Fragment key={i}>
                {d.kind === "MILESTONE" && d.ganttEnd ? (
                  <Polygon
                    points={`${labelWidth + x(d.ganttEnd)},${y + 2} ${labelWidth + x(d.ganttEnd) + 5},${y + rowHeight / 2} ${labelWidth + x(d.ganttEnd)},${y + rowHeight - 2} ${labelWidth + x(d.ganttEnd) - 5},${y + rowHeight / 2}`}
                    fill={d.colorHex}
                  />
                ) : (
                  d.ganttStart &&
                  d.ganttEnd && (
                    <>
                      <Rect
                        x={labelWidth + x(d.ganttStart)}
                        y={barY}
                        width={Math.max(2, x(d.ganttEnd) - x(d.ganttStart))}
                        height={7}
                        rx={1.5}
                        fill={d.colorHex}
                      />
                      {d.hasApprovalWindow && d.approvalWindowStart && (
                        <Rect
                          x={labelWidth + x(d.approvalWindowStart)}
                          y={barY}
                          width={Math.max(2, x(d.ganttEnd) - x(d.approvalWindowStart))}
                          height={7}
                          rx={1.5}
                          fill="#9ca3af"
                          fillOpacity={0.5}
                        />
                      )}
                    </>
                  )
                )}
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Labels overlay drawn as plain text rows aligned with the SVG rows above */}
        <View style={{ position: "absolute", top: 16 + 38, left: 28 }}>
          {flatRows.map((row, i) => (
            <View key={i} style={{ height: rowHeight, justifyContent: "center" }}>
              {row.kind === "front" ? (
                <Text style={{ fontSize: 7, fontWeight: 700, color: "#fff", paddingLeft: 4 }}>
                  {row.front.vendorName} — {row.front.name}
                </Text>
              ) : (
                <Text style={{ fontSize: 6.5, color: "#374151", paddingLeft: 4, width: labelWidth - 8 }}>
                  {row.deliverable.name}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
      <Footer note="Documento gerencial. A contagem real segue a data efetiva de envio ao cliente." />
    </Page>
  );
}

function OperationalReadingPage({ view }: { view: ProjectView }) {
  const all = view.fronts.flatMap((f) => f.deliverables);
  const atrasados = all.filter((d) => d.status === "ATRASO_OPERACIONAL" || d.status === "ATRASO_CONTRATUAL");
  const emDia = all.filter((d) => d.status === "EM_DIA" || d.status === "CONCLUIDO");
  const aFazer = all.filter((d) => d.status === "A_FAZER");

  const Column = ({
    title,
    items,
    tone,
  }: {
    title: string;
    items: typeof all;
    tone: "bad" | "ok" | "neutral";
  }) => (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 4,
        padding: 8,
        marginRight: 8,
      }}
    >
      <Text
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          color: tone === "bad" ? "#b91c1c" : tone === "ok" ? "#047857" : "#4b5563",
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      {items.length === 0 && <Text style={{ fontSize: 7, color: MUTED }}>Nenhum item.</Text>}
      {items.map((d) => (
        <Text key={d.id} style={{ fontSize: 7, color: "#374151", marginBottom: 3, lineHeight: 1.4 }}>
          • {d.name}: {d.ruleLabel ?? d.situacaoClickup ?? "—"}
        </Text>
      ))}
    </View>
  );

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <Header view={view} kicker="Leitura operacional" title="O que está atrasado, em dia e ainda por fazer" />
      <View style={styles.body}>
        <View style={{ flexDirection: "row" }}>
          <Column title="Atrasado / atenção" items={atrasados} tone="bad" />
          <Column title="Em dia / concluído" items={emDia} tone="ok" />
          <Column title="A fazer" items={aFazer} tone="neutral" />
        </View>
      </View>
      <Footer note="Links no documento abrem as tarefas correspondentes no ClickUp." />
    </Page>
  );
}

export function ReportDocument({ view }: { view: ProjectView }) {
  return (
    <Document title={`Painel de Projetos - ${view.clientName} - ${view.name}`}>
      <ExecutiveSummaryPage view={view} />
      <GanttPage view={view} />
      <OperationalReadingPage view={view} />
    </Document>
  );
}
