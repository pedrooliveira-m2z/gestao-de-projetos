import { notFound } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import { assertProjectAccess } from "@/lib/access";
import { loadProjectView } from "@/lib/project-data";
import { ReportDocument } from "@/lib/pdf/ReportDocument";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  await assertProjectAccess(projectId);
  const view = await loadProjectView(projectId);
  if (!view) notFound();

  const buffer = await renderToBuffer(ReportDocument({ view }));
  const fileName = `painel-${view.slug}-${view.cutoffDate.toISOString().slice(0, 10)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
