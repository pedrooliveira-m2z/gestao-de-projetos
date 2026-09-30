import { notFound } from "next/navigation";
import ExcelJS from "exceljs";
import { assertProjectAccess } from "@/lib/access";
import { loadProjectView } from "@/lib/project-data";
import { formatFullDate } from "@/lib/format";

export const runtime = "nodejs";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0B0E14" },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  await assertProjectAccess(projectId);
  const view = await loadProjectView(projectId);
  if (!view) notFound();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Catalisti Holding";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Cronograma", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Frente", key: "frente", width: 22 },
    { header: "Entrega", key: "entrega", width: 34 },
    { header: "Tipo", key: "tipo", width: 10 },
    { header: "Regra de prazo", key: "regra", width: 50 },
    { header: "Início", key: "inicio", width: 12 },
    { header: "Data limite", key: "fim", width: 12 },
    { header: "Estimado", key: "estimado", width: 10 },
    { header: "Situação no ClickUp", key: "situacao", width: 22 },
    { header: "Leitura executiva", key: "status", width: 20 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { vertical: "middle" };
  });

  view.fronts.forEach((front) => {
    front.deliverables.forEach((d) => {
      const row = sheet.addRow({
        frente: `${front.vendorName} — ${front.name}`,
        entrega: d.name,
        tipo: d.kind === "MILESTONE" ? "Marco" : "Barra",
        regra: d.ruleLabel ?? "",
        inicio: d.ganttStart ? formatFullDate(d.ganttStart) : "",
        fim: d.deadline ? formatFullDate(d.deadline) : d.ganttEnd ? formatFullDate(d.ganttEnd) : "",
        estimado: d.isEstimated ? "Sim" : "",
        situacao: d.situacaoClickup ?? "",
        status: d.statusLabel,
      });
      row.getCell("entrega").font = { bold: true };
    });
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
