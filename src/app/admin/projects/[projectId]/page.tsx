import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopNav } from "@/components/TopNav";
import { formatFullDate } from "@/lib/format";
import { getClickupToken } from "@/lib/clickup";
import { AdminEditableSections } from "./AdminEditableSections";

export default async function AdminProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (session?.user?.role === "CLIENT") redirect("/dashboard");

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      fronts: { orderBy: { order: "asc" }, include: { deliverables: { orderBy: { order: "asc" } } } },
    },
  });
  if (!project) notFound();

  const clickupConnected = !!(await getClickupToken());

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
          {project.client.name}
        </p>
        <h1 className="text-2xl font-bold text-neutral-900">{project.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Briefing em {formatFullDate(project.briefingDate)}
        </p>

        {!clickupConnected && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            ClickUp não conectado.{" "}
            <Link href="/admin/clickup" className="font-semibold underline">
              Conectar agora
            </Link>{" "}
            para puxar status ao vivo e importar tarefas.
          </div>
        )}

        <AdminEditableSections
          projectId={project.id}
          initialCutoffDate={(project.cutoffDate ?? new Date()).toISOString().slice(0, 10)}
          clickupConnected={clickupConnected}
          fronts={project.fronts}
        />
      </main>
    </div>
  );
}
