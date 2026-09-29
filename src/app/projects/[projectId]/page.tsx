import { notFound } from "next/navigation";
import { assertProjectAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  loadProjectView,
  nextContractualDeadline,
  nextOperationalDeadline,
  listOperationalAttention,
} from "@/lib/project-data";
import { TopNav } from "@/components/TopNav";
import { ProjectTabs } from "@/components/ProjectTabs";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PanelNoteRow } from "@/components/PanelNoteRow";
import { formatFullDate, formatShortDate, formatWeekday } from "@/lib/format";
import { addPanelNoteAction } from "./actions";

export default async function ProjectExecutivePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { session } = await assertProjectAccess(projectId);
  const view = await loadProjectView(projectId);
  if (!view) notFound();
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "INTERNAL";
  const panelNotes = await prisma.panelNote.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  const addPanelNote = addPanelNoteAction.bind(null, projectId);

  const nextOperational = nextOperationalDeadline(view);
  const nextContractual = nextContractualDeadline(view);
  const attention = listOperationalAttention(view);
  const hasContractualDelay = attention.some((d) => d.status === "ATRASO_CONTRATUAL");

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="bg-[#0b0e14] px-6 py-6 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold tracking-[0.15em] text-neutral-400 uppercase">
            Painel geral de projetos
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            {view.clientName} / {view.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-300">
            Status executivo · briefing em {formatFullDate(view.briefingDate)} e corte em{" "}
            {formatFullDate(view.cutoffDate)}
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <ProjectTabs projectId={view.id} active="resumo" />

        <section className="mt-6">
          <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Visão executiva
          </p>
          <h2 className="mt-1 text-lg font-bold text-neutral-900">
            Prazo contratual x execução operacional
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Briefing / referência"
              value={formatShortDate(view.briefingDate)}
              hint={formatWeekday(view.briefingDate)}
            />
            <KpiCard label="Data de corte" value={formatShortDate(view.cutoffDate)} hint="hoje" />
            <KpiCard
              label="Próximo prazo operacional"
              value={nextOperational ? formatShortDate(nextOperational.ganttEnd) : "—"}
              hint={nextOperational?.name}
            />
            <KpiCard
              label="Próximo prazo contratual"
              value={nextContractual ? formatShortDate(nextContractual.deadline) : "—"}
              hint={nextContractual?.name}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div
              className={`rounded-lg border p-4 ${
                hasContractualDelay
                  ? "border-red-200 bg-red-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <p
                className={`text-sm font-bold ${
                  hasContractualDelay ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {hasContractualDelay
                  ? "Atraso contratual identificado"
                  : "Nenhum atraso contratual identificado"}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                {hasContractualDelay
                  ? "Um ou mais prazos calculados a partir do briefing já venceram na data de corte."
                  : "Os prazos máximos calculados a partir do briefing ainda não venceram na data de corte."}
              </p>
            </div>
            <div
              className={`rounded-lg border p-4 ${
                attention.length > 0
                  ? "border-red-200 bg-red-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <p
                className={`text-sm font-bold ${
                  attention.length > 0 ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {attention.length > 0
                  ? `${attention.length} atenção(ões) operacional(is) no ClickUp`
                  : "Nenhuma atenção operacional no ClickUp"}
              </p>
              {attention.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-neutral-600">
                  {attention.map((d) => (
                    <li key={d.id}>
                      “{d.name}” venceu em {formatShortDate(d.ganttEnd)} e segue como{" "}
                      {d.situacaoClickup ?? "pendente"}.
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-[#0b0e14] text-left text-xs font-semibold text-white uppercase">
                  <th className="px-4 py-2.5">Frente / entrega</th>
                  <th className="px-4 py-2.5">Regra de prazo</th>
                  <th className="px-4 py-2.5">Data limite</th>
                  <th className="px-4 py-2.5">Situação no ClickUp</th>
                  <th className="px-4 py-2.5">Leitura executiva</th>
                </tr>
              </thead>
              <tbody>
                {view.fronts.flatMap((front) =>
                  front.deliverables.map((d, idx) => (
                    <tr
                      key={d.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50"}
                    >
                      <td className="px-4 py-2.5">
                        <span
                          className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                          style={{ backgroundColor: d.colorHex }}
                        />
                        {front.name} — {d.name}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">{d.ruleLabel ?? "—"}</td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {formatFullDate(d.deadline ?? d.ganttEnd)}
                        {d.isEstimated && "*"}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {d.situacaoClickup ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={d.status} label={d.statusLabel} />
                      </td>
                    </tr>
                  ))
                )}
                {panelNotes.map((note, idx) => (
                  <PanelNoteRow
                    key={note.id}
                    projectId={view.id}
                    canEdit={canEdit}
                    note={note}
                    rowClassName={
                      (view.fronts.flatMap((f) => f.deliverables).length + idx) % 2 === 0
                        ? "bg-white"
                        : "bg-neutral-50"
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>

          {canEdit && (
            <form
              action={addPanelNote}
              className="mt-3 grid gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-3 sm:grid-cols-5"
            >
              <input
                name="label"
                placeholder="Rótulo (ex: Observação geral)"
                required
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
              />
              <input
                name="ruleText"
                placeholder="Regra / observação"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
              />
              <input
                name="dateText"
                placeholder="Data / referência"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
              />
              <input
                name="statusText"
                placeholder="Situação (texto livre)"
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
              />
              <div className="flex gap-2">
                <select
                  name="status"
                  defaultValue="EM_DIA"
                  className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                >
                  <option value="CONCLUIDO">Concluído</option>
                  <option value="EM_DIA">Em dia</option>
                  <option value="ATRASO_OPERACIONAL">Atraso operacional</option>
                  <option value="ATRASO_CONTRATUAL">Atraso contratual</option>
                  <option value="A_FAZER">A fazer</option>
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
                >
                  Adicionar linha
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
