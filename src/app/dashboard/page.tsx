import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopNav } from "@/components/TopNav";
import { formatFullDate } from "@/lib/format";

export default async function DashboardPage() {
  const session = await auth();
  const isClient = session?.user?.role === "CLIENT";

  const projects = await prisma.project.findMany({
    where: isClient ? { clientId: session?.user?.clientId ?? "" } : undefined,
    include: { client: true, _count: { select: { fronts: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-bold text-neutral-900">Painéis de projetos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Status executivo por cliente, com prazos contratuais e leitura operacional do ClickUp.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-400 hover:shadow-md"
            >
              <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                {project.client.name}
              </p>
              <h2 className="mt-1 text-lg font-bold text-neutral-900">{project.name}</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Briefing em {formatFullDate(project.briefingDate)} · {project._count.fronts} frentes
              </p>
            </Link>
          ))}
          {projects.length === 0 && (
            <p className="text-sm text-neutral-500">
              Nenhum projeto cadastrado ainda. Peça a um administrador para criar um em{" "}
              <Link href="/admin" className="underline">
                Administração
              </Link>
              .
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
