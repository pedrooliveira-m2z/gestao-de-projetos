import { notFound } from "next/navigation";
import ExcelJS from "exceljs";
import { assertProjectAccess } from "@/lib/access";
import { loadProjectView } from "@/lib/project-data";

export const runtime = "nodejs";

const INK = "FF0B0E14";
const WEEKEND_FILL = "FFF1F1F1";
const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

function fill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function toArgb(hex: string): string {
  const clean = hex.replace("#", "").toUpperCase();
  return `FF${clean}`;
}

function enumerateDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  await assertProjectAccess(projectId);
  const view = await loadProjectView(projectId);
  if (!view) notFound();

  const allDeliverables = view.fronts.flatMap((f) => f.deliverables);
  const allDates = allDeliverables
    .flatMap((d) => [d.ganttStart, d.ganttEnd, ...d.marks.flatMap((m) => [m.start, m.end])])
    .filter((d): d is Date => !!d);
  allDates.push(view.cutoffDate);

  const rangeStart = allDates.length
    ? new Date(Math.min(...allDates.map((d) => d.getTime())) - 3 * DAY_MS)
    : new Date(view.cutoffDate.getTime() - 3 * DAY_MS);
  const rangeEnd = allDates.length
    ? new Date(Math.max(...allDates.map((d) => d.getTime())) + 3 * DAY_MS)
    : new Date(view.cutoffDate.getTime() + 3 * DAY_MS);
  const days = enumerateDays(rangeStart, rangeEnd);

  const FIXED_COLS = 5; // Frente, Entrega, Situação, Data limite, Detalhes
  const DAY_COL_START = FIXED_COLS + 1;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Catalisti Holding";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Cronograma", {
    views: [{ state: "frozen", xSplit: FIXED_COLS, ySplit: 3 }],
  });

  const totalCols = FIXED_COLS + days.length;

  // Row 1: banner title
  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `CRONOGRAMA DE DEMANDAS — ${view.clientName.toUpperCase()}`;
  titleCell.fill = fill(INK);
  titleCell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 12 };
  titleCell.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 22;

  // Row 2: month bands over the day columns
  sheet.getCell(2, 1).fill = fill(INK);
  if (FIXED_COLS > 1) sheet.mergeCells(2, 1, 2, FIXED_COLS);
  let monthStartCol = DAY_COL_START;
  let currentMonth = days[0] ? days[0].getUTCMonth() : 0;
  days.forEach((day, i) => {
    const col = DAY_COL_START + i;
    const month = day.getUTCMonth();
    if (month !== currentMonth || i === days.length - 1) {
      const endCol = month !== currentMonth ? col - 1 : col;
      if (endCol >= monthStartCol) {
        if (endCol > monthStartCol) sheet.mergeCells(2, monthStartCol, 2, endCol);
        const cell = sheet.getCell(2, monthStartCol);
        cell.value = MONTHS[currentMonth];
        cell.fill = fill(INK);
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 8 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
      monthStartCol = col;
      currentMonth = month;
    }
  });

  // Row 3: column headers
  const headerRow = sheet.getRow(3);
  const headers = ["Frente", "Entrega", "Situação executiva", "Data limite", "Detalhes"];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = fill(INK);
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 9 };
    cell.alignment = { vertical: "middle" };
  });
  days.forEach((day, i) => {
    const cell = headerRow.getCell(DAY_COL_START + i);
    cell.value = `${String(day.getUTCDate()).padStart(2, "0")}/${String(day.getUTCMonth() + 1).padStart(2, "0")}`;
    const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
    cell.fill = fill(isWeekend ? "FF3F4250" : INK);
    cell.font = { color: { argb: "FFFFFFFF" }, size: 7 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  headerRow.height = 16;

  // Column widths
  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 46;
  for (let i = 0; i < days.length; i++) {
    sheet.getColumn(DAY_COL_START + i).width = 5;
  }

  // Data rows
  let rowIndex = 4;
  view.fronts.forEach((front) => {
    front.deliverables.forEach((d) => {
      const row = sheet.getRow(rowIndex);
      row.getCell(1).value = `${front.vendorName} — ${front.name}`;
      row.getCell(2).value = d.name;
      row.getCell(2).font = { bold: true };
      row.getCell(3).value = d.statusLabel;
      row.getCell(4).value = d.deadline ?? d.ganttEnd ?? null;
      row.getCell(4).numFmt = "dd/mm/yyyy";
      row.getCell(5).value = d.ruleLabel ?? "";
      row.getCell(5).alignment = { wrapText: true, vertical: "top" };

      // Weekend shading on every row, then paint over the deliverable's own range + marks.
      days.forEach((day, i) => {
        const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
        if (isWeekend) row.getCell(DAY_COL_START + i).fill = fill(WEEKEND_FILL);
      });

      const ranges: Array<{ start: Date | null; end: Date | null; colorHex: string }> = [
        // Milestones only carry an end date; treat them as a single-day range at that date.
        { start: d.ganttStart ?? d.ganttEnd, end: d.ganttEnd, colorHex: d.colorHex },
        ...d.marks.map((m) => ({ start: m.start, end: m.end, colorHex: m.colorHex })),
      ];
      const argb = toArgb(d.colorHex);
      ranges.forEach((range) => {
        if (!range.start || !range.end) return;
        days.forEach((day, i) => {
          if (day.getTime() >= range.start!.getTime() && day.getTime() < range.end!.getTime()) {
            row.getCell(DAY_COL_START + i).fill = fill(range.colorHex ? toArgb(range.colorHex) : argb);
          }
        });
        // Milestones (single-point) and 1-day ranges: make sure the end day itself shows too.
        if (range.start.getTime() === range.end.getTime()) {
          const idx = days.findIndex((day) => day.getTime() === range.start!.getTime());
          if (idx >= 0) row.getCell(DAY_COL_START + idx).fill = fill(argb);
        }
      });

      row.commit();
      rowIndex++;
    });
  });

  sheet.getColumn(1).eachCell({ includeEmpty: false }, (cell) => {
    cell.alignment = { ...cell.alignment, vertical: "middle" };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `painel-${view.slug}-${view.cutoffDate.toISOString().slice(0, 10)}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
