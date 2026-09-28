import { notFound } from "next/navigation";
import { assertProjectAccess } from "@/lib/access";
import { loadProjectView } from "@/lib/project-data";
import { TopNav } from "@/components/TopNav";
import { ProjectTabs } from "@/components/ProjectTabs";
import { GanttChart } from "@/components/GanttChart";
import { formatFullDate } from "@/lib/format";

export default async function ProjectGanttPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { session } = await assertProjectAccess(projectId);
  const view = await loadProjectView(projectId);
  if (!view) notFound();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "INTERNAL";

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="bg-[#0b0e14] px-6 py-6 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold tracking-[0.15em] text-neutral-400 uppercase">
            Gantt atualizado
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            {view.clientName} / {view.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-300">
            Produção, design e aprovações · corte em {formatFullDate(view.cutoffDate)}
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <ProjectTabs projectId={view.id} active="gantt" />
        <div className="mt-6">
          <GanttChart
            fronts={view.fronts}
            cutoffDate={view.cutoffDate}
            projectId={view.id}
            canEdit={canEdit}
          />
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-neutral-500">
            {view.fronts.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.colorHex }} />
                {f.name}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 border border-dashed border-neutral-500 bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.15)_0,rgba(0,0,0,0.15)_2px,transparent_2px,transparent_6px)]" />
              Aprovação do cliente
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-red-500" />
              Hoje
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
