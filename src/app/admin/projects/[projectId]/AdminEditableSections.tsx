"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Deliverable, Front } from "@prisma/client";
import {
  addDeliverableAction,
  addFrontAction,
  deleteDeliverableAction,
  deleteFrontAction,
  updateCutoffAction,
  updateDeliverableColorAction,
  updateDeliverableApprovalColorAction,
} from "../../actions";
import { importClickupListAction } from "../../clickup/actions";
import { ContractUploadForm } from "../../contract/ContractUploadForm";
import { SuggestionsReview } from "../../contract/SuggestionsReview";
import type { ContractSuggestion } from "@/lib/contract-analysis";

type FrontWithDeliverables = Front & { deliverables: Deliverable[] };

export function AdminEditableSections({
  projectId,
  initialCutoffDate,
  clickupConnected,
  fronts,
}: {
  projectId: string;
  initialCutoffDate: string;
  clickupConnected: boolean;
  fronts: FrontWithDeliverables[];
}) {
  const [cutoffDate, setCutoffDate] = useState(initialCutoffDate);
  // undefined = untouched (use the deliverable's saved value); null = explicit "use front color".
  const [colorEdits, setColorEdits] = useState<Record<string, string | null>>({});
  const [approvalColorEdits, setApprovalColorEdits] = useState<Record<string, string | null>>({});
  const [isSaving, startSaving] = useTransition();

  const cutoffDirty = cutoffDate !== initialCutoffDate;
  const pendingCount =
    (cutoffDirty ? 1 : 0) + Object.keys(colorEdits).length + Object.keys(approvalColorEdits).length;

  function saveAll() {
    startSaving(async () => {
      const tasks: Promise<unknown>[] = [];
      if (cutoffDirty) {
        const fd = new FormData();
        fd.set("cutoffDate", cutoffDate);
        tasks.push(updateCutoffAction(projectId, fd));
      }
      for (const [id, hex] of Object.entries(colorEdits)) {
        const fd = new FormData();
        fd.set("colorHexOverride", hex ?? "");
        tasks.push(updateDeliverableColorAction(projectId, id, fd));
      }
      for (const [id, hex] of Object.entries(approvalColorEdits)) {
        const fd = new FormData();
        fd.set("approvalColorHex", hex ?? "");
        tasks.push(updateDeliverableApprovalColorAction(projectId, id, fd));
      }
      await Promise.all(tasks);
      setColorEdits({});
      setApprovalColorEdits({});
    });
  }

  function discardAll() {
    setCutoffDate(initialCutoffDate);
    setColorEdits({});
    setApprovalColorEdits({});
  }

  const addFront = addFrontAction.bind(null, projectId);

  return (
    <>
      {pendingCount > 0 && (
        <div className="sticky top-0 z-20 -mx-6 mb-4 flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs">
          <span className="font-semibold text-amber-800">
            {pendingCount} alteraç{pendingCount > 1 ? "ões" : "ão"} pendente{pendingCount > 1 ? "s" : ""}
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={discardAll}
              disabled={isSaving}
              className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 font-semibold text-neutral-600 hover:border-neutral-500 disabled:opacity-60"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={isSaving}
              className="rounded-md bg-neutral-900 px-2.5 py-1 font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </button>
          </span>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600">Data de corte (hoje)</label>
          <input
            type="date"
            value={cutoffDate}
            onChange={(e) => setCutoffDate(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <section className="mt-8 space-y-6">
        {fronts.map((front) => {
          const deleteFront = deleteFrontAction.bind(null, projectId, front.id);
          const addDeliverable = addDeliverableAction.bind(null, projectId, front.id);
          const importFromClickup = importClickupListAction.bind(null, projectId, front.id);
          return (
            <div key={front.id} className="rounded-lg border border-neutral-200 bg-white">
              <div
                className="flex items-center justify-between px-4 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: front.colorHex }}
              >
                <span>
                  {front.vendorName} — {front.name}
                </span>
                <form action={deleteFront}>
                  <button type="submit" className="text-xs font-semibold text-white/80 hover:text-white">
                    Remover frente
                  </button>
                </form>
              </div>

              <div className="divide-y divide-neutral-100">
                {front.deliverables.map((d) => {
                  const deleteDeliverable = deleteDeliverableAction.bind(null, projectId, d.id);
                  const currentColor =
                    colorEdits[d.id] !== undefined ? colorEdits[d.id] : d.colorHexOverride;
                  const currentApprovalColor =
                    approvalColorEdits[d.id] !== undefined
                      ? approvalColorEdits[d.id]
                      : d.approvalColorHex;
                  return (
                    <div key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <div>
                        <p className="flex items-center gap-1.5 font-medium text-neutral-800">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: currentColor ?? front.colorHex }}
                          />
                          {d.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {d.ruleLabel ?? d.triggerType} · {d.kind}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={currentColor ?? front.colorHex}
                          onChange={(e) =>
                            setColorEdits((prev) => ({ ...prev, [d.id]: e.target.value }))
                          }
                          title="Cor desta entrega"
                          className="h-6 w-7 cursor-pointer rounded border border-neutral-300"
                        />
                        {currentColor && (
                          <button
                            type="button"
                            onClick={() => setColorEdits((prev) => ({ ...prev, [d.id]: null }))}
                            className="text-[11px] text-neutral-400 underline hover:text-neutral-700"
                          >
                            usar cor da frente
                          </button>
                        )}
                        {d.hasApprovalWindow && (
                          <input
                            type="color"
                            value={currentApprovalColor ?? "#9ca3af"}
                            onChange={(e) =>
                              setApprovalColorEdits((prev) => ({ ...prev, [d.id]: e.target.value }))
                            }
                            title="Cor da janela de aprovação"
                            className="h-6 w-7 cursor-pointer rounded border border-neutral-300"
                          />
                        )}
                        <form action={deleteDeliverable}>
                          <button type="submit" className="text-xs text-red-600 hover:underline">
                            remover
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>

              {clickupConnected && (
                <form
                  action={importFromClickup}
                  className="flex items-end gap-2 border-t border-neutral-200 bg-neutral-50 p-3"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="text-xs font-medium text-neutral-600">
                      Importar tarefas do ClickUp (ID da lista)
                    </label>
                    <input
                      name="listId"
                      placeholder="ID da lista"
                      defaultValue={front.clickupListId ?? ""}
                      required
                      className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold hover:border-neutral-500"
                  >
                    Importar / sincronizar
                  </button>
                  <Link href="/admin/clickup" className="text-xs text-neutral-500 underline">
                    ver listas
                  </Link>
                </form>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 p-3">
                <ContractUploadForm
                  frontId={front.id}
                  projectId={projectId}
                  hasContract={!!front.contractFileUrl}
                />
                {front.contractFileUrl && (
                  <a
                    href={front.contractFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Ver contrato atual ({front.contractFileName})
                  </a>
                )}
              </div>

              {front.contractAnalysis != null && (
                <SuggestionsReview
                  projectId={projectId}
                  frontId={front.id}
                  suggestions={front.contractAnalysis as unknown as ContractSuggestion[]}
                />
              )}

              <form
                action={addDeliverable}
                className="grid gap-2 border-t border-neutral-200 p-4 sm:grid-cols-3"
              >
                <input
                  name="name"
                  placeholder="Nome da entrega"
                  required
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                />
                <input
                  name="ruleLabel"
                  placeholder="Regra de prazo (texto exibido)"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                />
                <select name="kind" className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs">
                  <option value="BAR">Barra (período)</option>
                  <option value="MILESTONE">Marco (diamante)</option>
                </select>
                <select
                  name="triggerType"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                >
                  <option value="BRIEFING">Gatilho: briefing do projeto</option>
                  <option value="KICKOFF">Gatilho: kickoff (data manual)</option>
                  <option value="CONDICOES_INICIO">Gatilho: condições de início (data manual)</option>
                  <option value="MARCO_CICLO">Gatilho: marco de ciclo (data manual)</option>
                  <option value="MANUAL">Gatilho: datas manuais (sem cálculo de SLA)</option>
                  <option value="CLICKUP_ONLY">Gatilho: só ClickUp (sem cálculo de SLA)</option>
                </select>
                <input
                  type="date"
                  name="triggerDate"
                  title="Data do gatilho (kickoff/condições/marco/manual)"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                />
                <input
                  type="number"
                  name="slaDays"
                  placeholder="Nº de dias do SLA"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                />
                <select
                  name="slaDayType"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                >
                  <option value="UTEIS">Dias úteis</option>
                  <option value="CORRIDOS">Dias corridos</option>
                </select>
                <input
                  type="date"
                  name="startDateOverride"
                  title="Início manual da barra no Gantt (opcional)"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                />
                <input
                  type="date"
                  name="endDateOverride"
                  title="Fim manual / data-limite fixa (opcional)"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                />
                <input
                  name="clickupTaskId"
                  placeholder="ID da tarefa no ClickUp (opcional)"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                />
                <input
                  name="manualStatusLabel"
                  placeholder="Situação manual (se sem ClickUp)"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                />
                <label className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <input type="checkbox" name="isEstimated" /> data estimada (*)
                </label>
                <label className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <input type="checkbox" name="hasApprovalWindow" /> tem janela de aprovação
                  <input
                    type="color"
                    name="approvalColorHex"
                    defaultValue="#9ca3af"
                    title="Cor da janela de aprovação (só aplica se marcado acima)"
                    className="h-7 w-9 cursor-pointer rounded border border-neutral-300"
                  />
                </label>
                <input
                  type="number"
                  name="approvalDays"
                  placeholder="Dias de aprovação (padrão 5)"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                />
                <label className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <input type="checkbox" name="hasColorOverride" /> cor própria
                  <input
                    type="color"
                    name="colorHexOverride"
                    defaultValue={front.colorHex}
                    title="Só aplica se 'cor própria' estiver marcado; senão usa a cor da frente"
                    className="h-7 w-9 cursor-pointer rounded border border-neutral-300"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
                >
                  Adicionar entrega
                </button>
              </form>
            </div>
          );
        })}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-neutral-700 uppercase">Nova frente</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Depois de criar, a frente aparece na lista acima com um campo para anexar o contrato — a IA lê
          o arquivo e sugere as regras de prazo de cada entrega.
        </p>
        <form
          action={addFront}
          className="mt-3 grid gap-2 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-4"
        >
          <input
            name="name"
            placeholder="Nome (ex: Web)"
            required
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            name="vendorName"
            placeholder="Responsável (ex: M2Z Creative Tech)"
            required
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            type="color"
            name="colorHex"
            defaultValue="#2563eb"
            className="h-9 w-full rounded-md border border-neutral-300"
          />
          <button
            type="submit"
            className="rounded-md bg-[#0b0e14] px-3 py-1.5 text-sm font-semibold text-white hover:bg-black"
          >
            Adicionar frente
          </button>
        </form>
      </section>
    </>
  );
}
