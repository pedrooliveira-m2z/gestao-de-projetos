"use client";

import { useState } from "react";
import { updatePanelNoteAction, deletePanelNoteAction } from "@/app/projects/[projectId]/actions";
import { StatusBadge } from "./StatusBadge";
import { STATUS_LABEL, type DeliverableStatus } from "@/lib/sla";

const STATUS_OPTIONS: DeliverableStatus[] = [
  "CONCLUIDO",
  "EM_DIA",
  "ATRASO_OPERACIONAL",
  "ATRASO_CONTRATUAL",
  "A_FAZER",
];

export interface PanelNoteData {
  id: string;
  label: string;
  ruleText: string | null;
  dateText: string | null;
  statusText: string | null;
  status: DeliverableStatus;
}

export function PanelNoteRow({
  projectId,
  note,
  canEdit,
  rowClassName,
}: {
  projectId: string;
  note: PanelNoteData;
  canEdit: boolean;
  rowClassName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [label, setLabel] = useState(note.label);
  const [ruleText, setRuleText] = useState(note.ruleText ?? "");
  const [dateText, setDateText] = useState(note.dateText ?? "");
  const [statusText, setStatusText] = useState(note.statusText ?? "");
  const [status, setStatus] = useState<DeliverableStatus>(note.status);

  async function save() {
    setPending(true);
    try {
      await updatePanelNoteAction(projectId, note.id, {
        label,
        ruleText: ruleText || null,
        dateText: dateText || null,
        statusText: statusText || null,
        status,
      });
      setEditing(false);
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    setLabel(note.label);
    setRuleText(note.ruleText ?? "");
    setDateText(note.dateText ?? "");
    setStatusText(note.statusText ?? "");
    setStatus(note.status);
    setEditing(false);
  }

  async function remove() {
    setPending(true);
    await deletePanelNoteAction(projectId, note.id);
  }

  if (editing) {
    return (
      <tr className={rowClassName}>
        <td className="px-4 py-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Rótulo"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-4 py-2">
          <input
            value={ruleText}
            onChange={(e) => setRuleText(e.target.value)}
            placeholder="Regra / observação"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-4 py-2">
          <input
            value={dateText}
            onChange={(e) => setDateText(e.target.value)}
            placeholder="Data / referência"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-4 py-2">
          <input
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            placeholder="Situação"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DeliverableStatus)}
              className="rounded border border-neutral-300 px-1.5 py-1 text-xs"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="text-[11px] font-semibold text-emerald-700 hover:underline disabled:opacity-60"
            >
              salvar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={cancel}
              className="text-[11px] text-neutral-400 hover:underline"
            >
              cancelar
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={rowClassName}>
      <td className="px-4 py-2.5 italic text-neutral-700">
        <span
          className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
          style={{ backgroundColor: "#9ca3af" }}
        />
        {note.label}
      </td>
      <td className="px-4 py-2.5 text-neutral-600">{note.ruleText ?? "—"}</td>
      <td className="px-4 py-2.5 text-neutral-600">{note.dateText ?? "—"}</td>
      <td className="px-4 py-2.5 text-neutral-600">{note.statusText ?? "—"}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <StatusBadge status={note.status} label={STATUS_LABEL[note.status]} />
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[11px] text-neutral-500 hover:underline"
              >
                editar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={remove}
                className="text-[11px] text-red-600 hover:underline disabled:opacity-60"
              >
                remover
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
