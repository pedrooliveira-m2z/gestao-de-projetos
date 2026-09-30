"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { FrontView, DeliverableView } from "@/lib/project-data";
import { formatShortDate } from "@/lib/format";
import {
  updateDeliverableDatesAction,
  updateDeliverableApprovalWindowAction,
  addDeliverableAction,
  reorderDeliverablesAction,
  updateDeliverableNameAction,
  updateDeliverableRuleLabelAction,
  deleteDeliverableAction,
  addDeliverableMarkAction,
  updateDeliverableMarkDatesAction,
  deleteDeliverableMarkAction,
} from "@/app/admin/actions";

const LABEL_COL_WIDTH = 260;
const DAY_COL_WIDTH = 42;
const DAY_MS = 24 * 60 * 60 * 1000;

function pct(date: Date, start: Date, end: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, ((date.getTime() - start.getTime()) / total) * 100));
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

/** Left offset, as a CSS calc(), for a date inside the timeline area (right of the label column). */
function timelineLeft(pctValue: number): string {
  return `calc(${LABEL_COL_WIDTH}px + (100% - ${LABEL_COL_WIDTH}px) * ${pctValue / 100})`;
}

type DragFields = "both" | "start" | "end";

/** Accumulates which edges were touched across multiple drags before a single save. */
function mergeFields(prev: DragFields | undefined, next: DragFields): DragFields {
  if (!prev || prev === next) return next;
  return "both";
}
type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  mode: DragMode;
  startX: number;
  origStart: number;
  origEnd: number;
  lastStart: number;
  lastEnd: number;
}

interface TrackItem {
  key: string;
  kind: "BAR" | "MILESTONE";
  start: Date | null;
  end: Date | null;
  colorHex: string;
  titleText: string;
  variant?: "solid" | "approval";
  onPreview: (start: Date, end: Date) => void;
  onCommit: (start: Date, end: Date, fields: DragFields) => void;
  onDelete?: () => void;
}

/** A single BAR or MILESTONE mark inside a shared track, draggable (move/resize) when `canEdit` is true. */
function BarItem({
  trackRef,
  rangeStart,
  rangeEnd,
  canEdit,
  item,
}: {
  trackRef: React.RefObject<HTMLDivElement | null>;
  rangeStart: Date;
  rangeEnd: Date;
  canEdit: boolean;
  item: TrackItem;
}) {
  const { kind, start, end, colorHex, titleText, variant = "solid", onPreview, onCommit, onDelete } = item;
  const dragRef = useRef<DragState | null>(null);
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  function beginDrag(mode: DragMode) {
    return (e: React.PointerEvent<HTMLElement>) => {
      if (!canEdit || !start || !end) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        mode,
        startX: e.clientX,
        origStart: start.getTime(),
        origEnd: end.getTime(),
        lastStart: start.getTime(),
        lastEnd: end.getTime(),
      };
    };
  }

  function handleMove(e: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || !trackRef.current) return;
    e.preventDefault();
    const trackWidth = trackRef.current.getBoundingClientRect().width;
    if (trackWidth <= 0) return;
    const deltaPx = e.clientX - drag.startX;
    const deltaMs = Math.round(((deltaPx / trackWidth) * totalMs) / DAY_MS) * DAY_MS;

    let newStart = drag.origStart;
    let newEnd = drag.origEnd;
    if (drag.mode === "move") {
      newStart = drag.origStart + deltaMs;
      newEnd = drag.origEnd + deltaMs;
    } else if (drag.mode === "resize-start") {
      newStart = Math.min(drag.origStart + deltaMs, drag.origEnd - DAY_MS);
    } else {
      newEnd = Math.max(drag.origEnd + deltaMs, drag.origStart + DAY_MS);
    }
    newStart = Math.max(rangeStart.getTime(), Math.min(newStart, rangeEnd.getTime()));
    newEnd = Math.max(rangeStart.getTime(), Math.min(newEnd, rangeEnd.getTime()));

    drag.lastStart = newStart;
    drag.lastEnd = newEnd;
    onPreview(new Date(newStart), new Date(newEnd));
  }

  function handleUp() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const fields: DragFields =
      kind === "MILESTONE" ? "end" : drag.mode === "move" ? "both" : drag.mode === "resize-start" ? "start" : "end";
    onCommit(new Date(drag.lastStart), new Date(drag.lastEnd), fields);
  }

  const dragEvents = {
    onPointerMove: handleMove,
    onPointerUp: handleUp,
    onPointerCancel: handleUp,
  };
  // Prevent a click/double-click on an existing bar from also being read by the
  // track as "empty space clicked" (which would create a new mark underneath it).
  const stopClick = (e: React.MouseEvent) => e.stopPropagation();
  const handleDoubleClick = onDelete
    ? (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
      }
    : undefined;

  const barStyleExtra: React.CSSProperties =
    variant === "approval"
      ? {
          backgroundColor: colorHex,
          opacity: 0.65,
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.45) 0, rgba(255,255,255,0.45) 2px, transparent 2px, transparent 6px)",
        }
      : { backgroundColor: colorHex };
  const barClassName =
    variant === "approval"
      ? "absolute top-1/2 h-3 -translate-y-1/2 rounded-sm border border-dashed border-neutral-500"
      : "absolute top-1/2 h-4 -translate-y-1/2 rounded-sm";

  return kind === "MILESTONE" && end ? (
    <div
      className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45"
      style={{
        left: `${pct(end, rangeStart, rangeEnd)}%`,
        backgroundColor: colorHex,
        cursor: canEdit ? "grab" : undefined,
        touchAction: "none",
      }}
      onPointerDown={beginDrag("move")}
      onClick={stopClick}
      onDoubleClick={handleDoubleClick}
      {...dragEvents}
      title={titleText}
    />
  ) : (
    start &&
    end && (
      <div
        className={barClassName}
        style={{
          left: `${pct(start, rangeStart, rangeEnd)}%`,
          width: `${Math.max(0.6, pct(end, rangeStart, rangeEnd) - pct(start, rangeStart, rangeEnd))}%`,
          cursor: canEdit ? "grab" : undefined,
          touchAction: "none",
          ...barStyleExtra,
        }}
        onPointerDown={beginDrag("move")}
        onClick={stopClick}
        onDoubleClick={handleDoubleClick}
        {...dragEvents}
        title={titleText}
      >
        {canEdit && (
          <>
            <div
              className="absolute -left-1 top-0 h-full w-2.5 cursor-ew-resize"
              style={{ touchAction: "none" }}
              onPointerDown={beginDrag("resize-start")}
              onClick={stopClick}
              {...dragEvents}
            />
            <div
              className="absolute -right-1 top-0 h-full w-2.5 cursor-ew-resize"
              style={{ touchAction: "none" }}
              onPointerDown={beginDrag("resize-end")}
              onClick={stopClick}
              {...dragEvents}
            />
          </>
        )}
      </div>
    )
  );
}

/** The timeline area for one row: a shared track that can host several draggable items
 * (a deliverable's own bar plus any extra marks), and optionally create a new mark
 * when an empty day cell is clicked. */
function GanttTrack({
  rangeStart,
  rangeEnd,
  canEdit,
  variant = "solid",
  onEmptyClick,
  items,
}: {
  rangeStart: Date;
  rangeEnd: Date;
  canEdit: boolean;
  variant?: "solid" | "approval";
  onEmptyClick?: (date: Date) => void;
  items: TrackItem[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function handleTrackClick(e: React.MouseEvent) {
    if (!onEmptyClick || !canEdit || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickPct = (e.clientX - rect.left) / rect.width;
    const dateMs = rangeStart.getTime() + clickPct * (rangeEnd.getTime() - rangeStart.getTime());
    const snapped = Math.round(dateMs / DAY_MS) * DAY_MS;
    onEmptyClick(new Date(snapped));
  }

  return (
    <div
      ref={trackRef}
      className={`relative flex-1 ${variant === "approval" ? "py-1.5" : "py-2"} ${
        onEmptyClick && canEdit ? "cursor-cell" : ""
      }`}
      onClick={handleTrackClick}
      title={onEmptyClick && canEdit ? "Clique num dia vazio para criar uma nova barra" : undefined}
    >
      {items.map((item) => (
        <BarItem key={item.key} trackRef={trackRef} rangeStart={rangeStart} rangeEnd={rangeEnd} canEdit={canEdit} item={item} />
      ))}
    </div>
  );
}

export function GanttChart({
  fronts,
  cutoffDate,
  projectId,
  canEdit = false,
}: {
  fronts: FrontView[];
  cutoffDate: Date;
  projectId: string;
  canEdit?: boolean;
}) {
  const [overrides, setOverrides] = useState<Record<string, { start: Date; end: Date }>>({});
  const [approvalOverrides, setApprovalOverrides] = useState<Record<string, { start: Date; end: Date }>>(
    {}
  );
  const [pendingDateFields, setPendingDateFields] = useState<Record<string, DragFields>>({});
  const [pendingApprovalFields, setPendingApprovalFields] = useState<Record<string, DragFields>>({});
  const [isSaving, startSaving] = useTransition();
  const [addingRowFor, setAddingRowFor] = useState<string | null>(null);
  const [isAddingRow, startAddingRow] = useTransition();
  const [orderOverrides, setOrderOverrides] = useState<Record<string, string[]>>({});
  const [reorderedFronts, setReorderedFronts] = useState<Record<string, boolean>>({});
  const dragDeliverableRef = useRef<{ frontId: string; id: string } | null>(null);
  const [pendingNames, setPendingNames] = useState<Record<string, string>>({});
  const [pendingRuleLabels, setPendingRuleLabels] = useState<Record<string, string>>({});
  const [markOverrides, setMarkOverrides] = useState<Record<string, { start: Date; end: Date }>>({});
  const [pendingMarkFields, setPendingMarkFields] = useState<Record<string, DragFields>>({});
  const [, startAddingMark] = useTransition();

  function stageName(id: string, name: string) {
    setPendingNames((prev) => ({ ...prev, [id]: name }));
  }

  function stageRuleLabel(id: string, ruleLabel: string) {
    setPendingRuleLabels((prev) => ({ ...prev, [id]: ruleLabel }));
  }

  async function removeDeliverable(id: string, name: string) {
    if (!window.confirm(`Remover a entrega "${name}"? Essa ação não pode ser desfeita.`)) return;
    await deleteDeliverableAction(projectId, id);
  }

  function previewMark(markId: string, start: Date, end: Date) {
    setMarkOverrides((prev) => ({ ...prev, [markId]: { start, end } }));
  }

  function stageMark(markId: string, start: Date, end: Date, fields: DragFields) {
    setMarkOverrides((prev) => ({ ...prev, [markId]: { start, end } }));
    setPendingMarkFields((prev) => ({ ...prev, [markId]: mergeFields(prev[markId], fields) }));
  }

  function addMark(deliverableId: string, date: Date) {
    startAddingMark(async () => {
      await addDeliverableMarkAction(projectId, deliverableId, date.toISOString());
    });
  }

  async function removeMark(markId: string) {
    if (!window.confirm("Remover esta barra? Essa ação não pode ser desfeita.")) return;
    await deleteDeliverableMarkAction(projectId, markId);
  }

  function orderedDeliverables(front: FrontView): DeliverableView[] {
    const order = orderOverrides[front.id];
    if (!order) return front.deliverables;
    const byId = new Map(front.deliverables.map((d) => [d.id, d]));
    const known = order.map((id) => byId.get(id)).filter((d): d is DeliverableView => !!d);
    // Any deliverable not in the stored order (e.g. just added) goes at the end.
    const missing = front.deliverables.filter((d) => !order.includes(d.id));
    return [...known, ...missing];
  }

  function handleRowDragStart(frontId: string, id: string) {
    return (e: React.DragEvent) => {
      dragDeliverableRef.current = { frontId, id };
      e.dataTransfer.effectAllowed = "move";
    };
  }

  function handleRowDragOver(e: React.DragEvent) {
    if (dragDeliverableRef.current) e.preventDefault();
  }

  function handleRowDrop(front: FrontView, targetId: string) {
    return (e: React.DragEvent) => {
      const drag = dragDeliverableRef.current;
      dragDeliverableRef.current = null;
      if (!drag || drag.frontId !== front.id || drag.id === targetId) return;
      e.preventDefault();
      const current = orderedDeliverables(front).map((d) => d.id);
      const fromIdx = current.indexOf(drag.id);
      const toIdx = current.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return;
      const next = [...current];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, drag.id);
      setOrderOverrides((prev) => ({ ...prev, [front.id]: next }));
      setReorderedFronts((prev) => ({ ...prev, [front.id]: true }));
    };
  }

  const allDates = fronts
    .flatMap((f) => f.deliverables)
    .flatMap((d) => [
      d.ganttStart,
      d.approvalWindowStart,
      d.approvalWindowEnd,
      d.ganttEnd,
      ...d.marks.flatMap((m) => [m.start, m.end]),
    ])
    .filter((d): d is Date => !!d);
  allDates.push(cutoffDate);

  if (allDates.length === 0) {
    return <p className="text-sm text-neutral-500">Sem dados suficientes para montar o Gantt.</p>;
  }

  const rangeStart = new Date(Math.min(...allDates.map((d) => d.getTime())));
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 3);
  const rangeEnd = new Date(Math.max(...allDates.map((d) => d.getTime())));
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 3);

  const days = enumerateDays(rangeStart, rangeEnd);
  const todayPct = pct(cutoffDate, rangeStart, rangeEnd);

  function previewDates(deliverableId: string, start: Date, end: Date) {
    setOverrides((prev) => ({ ...prev, [deliverableId]: { start, end } }));
  }

  // Dragging only stages the change locally; nothing is saved until "Salvar alterações".
  function stageDates(deliverableId: string, start: Date, end: Date, fields: DragFields) {
    setOverrides((prev) => ({ ...prev, [deliverableId]: { start, end } }));
    setPendingDateFields((prev) => ({ ...prev, [deliverableId]: mergeFields(prev[deliverableId], fields) }));
  }

  function previewApproval(deliverableId: string, start: Date, end: Date) {
    setApprovalOverrides((prev) => ({ ...prev, [deliverableId]: { start, end } }));
  }

  function stageApproval(deliverableId: string, start: Date, end: Date, fields: DragFields) {
    setApprovalOverrides((prev) => ({ ...prev, [deliverableId]: { start, end } }));
    setPendingApprovalFields((prev) => ({
      ...prev,
      [deliverableId]: mergeFields(prev[deliverableId], fields),
    }));
  }

  const allDeliverables = fronts.flatMap((f) => f.deliverables);
  const nameById = new Map(allDeliverables.map((d) => [d.id, d.name]));
  const ruleLabelById = new Map(allDeliverables.map((d) => [d.id, d.ruleLabel ?? ""]));
  const dirtyNameIds = Object.keys(pendingNames).filter((id) => pendingNames[id] !== nameById.get(id));
  const dirtyRuleLabelIds = Object.keys(pendingRuleLabels).filter(
    (id) => pendingRuleLabels[id] !== ruleLabelById.get(id)
  );

  const pendingCount =
    Object.keys(pendingDateFields).length +
    Object.keys(pendingApprovalFields).length +
    Object.keys(reorderedFronts).length +
    dirtyNameIds.length +
    dirtyRuleLabelIds.length +
    Object.keys(pendingMarkFields).length;

  useEffect(() => {
    if (pendingCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingCount]);

  function saveAll() {
    startSaving(async () => {
      await Promise.all([
        ...Object.entries(pendingDateFields).map(([id, fields]) => {
          const ov = overrides[id];
          if (!ov) return Promise.resolve();
          const payload: { startDateOverride?: string | null; endDateOverride?: string | null } = {};
          if (fields === "both" || fields === "start") payload.startDateOverride = ov.start.toISOString();
          if (fields === "both" || fields === "end") payload.endDateOverride = ov.end.toISOString();
          return updateDeliverableDatesAction(projectId, id, payload);
        }),
        ...Object.entries(pendingApprovalFields).map(([id, fields]) => {
          const ov = approvalOverrides[id];
          if (!ov) return Promise.resolve();
          const payload: { approvalStartOverride?: string | null; approvalEndOverride?: string | null } = {};
          if (fields === "both" || fields === "start") payload.approvalStartOverride = ov.start.toISOString();
          if (fields === "both" || fields === "end") payload.approvalEndOverride = ov.end.toISOString();
          return updateDeliverableApprovalWindowAction(projectId, id, payload);
        }),
        ...Object.keys(reorderedFronts).map((frontId) => {
          const order = orderOverrides[frontId];
          if (!order) return Promise.resolve();
          return reorderDeliverablesAction(projectId, frontId, order);
        }),
        ...dirtyNameIds.map((id) => updateDeliverableNameAction(projectId, id, pendingNames[id])),
        ...dirtyRuleLabelIds.map((id) =>
          updateDeliverableRuleLabelAction(projectId, id, pendingRuleLabels[id])
        ),
        ...Object.entries(pendingMarkFields).map(([id, fields]) => {
          const ov = markOverrides[id];
          if (!ov) return Promise.resolve();
          const payload: { startDate?: string; endDate?: string } = {};
          if (fields === "both" || fields === "start") payload.startDate = ov.start.toISOString();
          if (fields === "both" || fields === "end") payload.endDate = ov.end.toISOString();
          return updateDeliverableMarkDatesAction(projectId, id, payload);
        }),
      ]);
      setOverrides({});
      setApprovalOverrides({});
      setPendingDateFields({});
      setPendingApprovalFields({});
      setOrderOverrides({});
      setReorderedFronts({});
      setPendingNames({});
      setPendingRuleLabels({});
      setMarkOverrides({});
      setPendingMarkFields({});
    });
  }

  function discardAll() {
    setOverrides({});
    setApprovalOverrides({});
    setPendingDateFields({});
    setPendingApprovalFields({});
    setOrderOverrides({});
    setReorderedFronts({});
    setPendingNames({});
    setPendingRuleLabels({});
    setMarkOverrides({});
    setPendingMarkFields({});
  }

  function addRow(frontId: string, formData: FormData) {
    startAddingRow(async () => {
      formData.set("triggerType", "MANUAL");
      await addDeliverableAction(projectId, frontId, formData);
      setAddingRowFor(null);
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      {canEdit && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-1.5 text-[11px] text-neutral-500">
          <span>Arraste as barras para mover, ou as bordas para redimensionar.</span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-2">
              <span className="font-semibold text-amber-700">
                {pendingCount} alteraç{pendingCount > 1 ? "ões" : "ão"} pendente
                {pendingCount > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={discardAll}
                disabled={isSaving}
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600 hover:border-neutral-500 disabled:opacity-60"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={saveAll}
                disabled={isSaving}
                className="rounded-md bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                {isSaving ? "Salvando..." : "Salvar alterações"}
              </button>
            </span>
          )}
        </div>
      )}
      <div style={{ minWidth: LABEL_COL_WIDTH + days.length * DAY_COL_WIDTH }}>
        {/* Timeline header */}
        <div className="relative flex border-b border-neutral-200 bg-[#0b0e14] text-white">
          <div style={{ width: LABEL_COL_WIDTH }} className="shrink-0 px-4 py-2 text-xs font-semibold uppercase">
            Frente / entrega
          </div>
          <div className="relative flex-1">
            <div className="flex h-full">
              {days.map((day, i) => {
                const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
                return (
                  <div
                    key={i}
                    className={`flex-1 border-l border-white/10 px-1 py-2 text-center text-[11px] whitespace-nowrap ${
                      isWeekend ? "text-neutral-500" : "text-neutral-300"
                    }`}
                  >
                    {formatShortDate(day)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="relative">
          {/* Day grid: weekend shading + a vertical line per day, behind everything else */}
          {days.map((day, i) => {
            const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
            if (!isWeekend) return null;
            const nextDay = new Date(day);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            const leftPct = pct(day, rangeStart, rangeEnd);
            const rightPct = pct(nextDay, rangeStart, rangeEnd);
            return (
              <div
                key={`weekend-${i}`}
                className="pointer-events-none absolute top-0 bottom-0 bg-neutral-50"
                style={{
                  left: timelineLeft(leftPct),
                  width: `calc((100% - ${LABEL_COL_WIDTH}px) * ${(rightPct - leftPct) / 100})`,
                }}
              />
            );
          })}
          {days.map((day, i) => (
            <div
              key={`gridline-${i}`}
              className="pointer-events-none absolute top-0 bottom-0 w-px bg-neutral-100"
              style={{ left: timelineLeft(pct(day, rangeStart, rangeEnd)) }}
            />
          ))}

          {/* Today line spans the whole body */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-red-500"
            style={{ left: timelineLeft(todayPct) }}
          >
            <span className="absolute -top-0 left-1 rounded-sm bg-red-500 px-1 text-[9px] font-bold whitespace-nowrap text-white">
              HOJE
            </span>
          </div>

          {canEdit &&
            (addingRowFor ? (
              <form
                action={(formData) => addRow(String(formData.get("frontId") ?? addingRowFor), formData)}
                className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-amber-50 px-4 py-2"
              >
                {fronts.length > 1 && (
                  <select
                    name="frontId"
                    defaultValue={addingRowFor}
                    className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                  >
                    {fronts.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.vendorName} — {f.name}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  name="name"
                  placeholder="Nome da entrega"
                  required
                  autoFocus
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                />
                <select
                  name="kind"
                  defaultValue="BAR"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                >
                  <option value="BAR">Barra (início + fim)</option>
                  <option value="MILESTONE">Marco (só data final)</option>
                </select>
                <input
                  type="date"
                  name="startDateOverride"
                  title="Início (ignorado para marco)"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                />
                <input
                  type="date"
                  name="endDateOverride"
                  required
                  title="Fim / data do marco"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                />
                <button
                  type="submit"
                  disabled={isAddingRow}
                  className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {isAddingRow ? "Adicionando..." : "Adicionar"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddingRowFor(null)}
                  className="text-xs text-neutral-400 hover:underline"
                >
                  cancelar
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingRowFor(fronts[0]?.id ?? null)}
                className="flex w-full items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[11px] leading-none text-blue-700">
                  +
                </span>
                Adicionar entrega
              </button>
            ))}
          {fronts.map((front) => (
            <div key={front.id}>
              {orderedDeliverables(front).map((d) => {
                const ov = overrides[d.id];
                const ganttStart = ov?.start ?? d.ganttStart;
                const ganttEnd = ov?.end ?? d.ganttEnd;
                return (
                  <div key={d.id}>
                    <div
                      className="flex border-b border-neutral-100"
                      onDragOver={handleRowDragOver}
                      onDrop={handleRowDrop(front, d.id)}
                    >
                      <div
                        style={{ width: LABEL_COL_WIDTH }}
                        className="flex shrink-0 items-start gap-1.5 px-4 py-2"
                      >
                        {canEdit && (
                          <span
                            draggable
                            onDragStart={handleRowDragStart(front.id, d.id)}
                            className="mt-0.5 cursor-grab select-none leading-none text-neutral-300 hover:text-neutral-500"
                            title="Arrastar para reordenar"
                          >
                            ⠿
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          {canEdit ? (
                            <input
                              value={pendingNames[d.id] ?? d.name}
                              onChange={(e) => stageName(d.id, e.target.value)}
                              className="w-full rounded border border-transparent bg-transparent px-1 -mx-1 text-sm font-medium text-neutral-800 hover:border-neutral-200 focus:border-neutral-400 focus:bg-white focus:outline-none"
                            />
                          ) : (
                            <p className="text-sm font-medium text-neutral-800">{d.name}</p>
                          )}
                          {canEdit ? (
                            <textarea
                              value={pendingRuleLabels[d.id] ?? d.ruleLabel ?? ""}
                              onChange={(e) => stageRuleLabel(d.id, e.target.value)}
                              placeholder="Descrição / regra de prazo"
                              rows={2}
                              className="mt-0.5 w-full resize-y rounded border border-transparent bg-transparent px-1 -mx-1 text-[11px] text-neutral-400 hover:border-neutral-200 focus:border-neutral-400 focus:bg-white focus:text-neutral-700 focus:outline-none"
                            />
                          ) : (
                            d.ruleLabel && <p className="text-[11px] text-neutral-400">{d.ruleLabel}</p>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => removeDeliverable(d.id, d.name)}
                            title="Remover entrega"
                            className="shrink-0 text-sm leading-none text-neutral-300 hover:text-red-600"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <GanttTrack
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        canEdit={canEdit}
                        onEmptyClick={(date) => addMark(d.id, date)}
                        items={[
                          {
                            key: d.id,
                            kind: d.kind,
                            start: ganttStart,
                            end: ganttEnd,
                            colorHex: d.colorHex,
                            titleText:
                              d.kind === "MILESTONE" && ganttEnd
                                ? formatShortDate(ganttEnd)
                                : ganttStart && ganttEnd
                                  ? `${formatShortDate(ganttStart)} - ${formatShortDate(ganttEnd)}`
                                  : "",
                            onPreview: (s, e) => previewDates(d.id, s, e),
                            onCommit: (s, e, fields) => stageDates(d.id, s, e, fields),
                          },
                          ...d.marks.map((m) => {
                            const mov = markOverrides[m.id];
                            const start = mov?.start ?? m.start;
                            const end = mov?.end ?? m.end;
                            return {
                              key: m.id,
                              kind: "BAR" as const,
                              start,
                              end,
                              colorHex: m.colorHex,
                              titleText: `${formatShortDate(start)} - ${formatShortDate(end)} (clique duplo para remover)`,
                              onPreview: (s: Date, e: Date) => previewMark(m.id, s, e),
                              onCommit: (s: Date, e: Date, fields: DragFields) => stageMark(m.id, s, e, fields),
                              onDelete: () => removeMark(m.id),
                            };
                          }),
                        ]}
                      />
                    </div>
                    {d.hasApprovalWindow &&
                      (() => {
                        const aov = approvalOverrides[d.id];
                        const approvalStart = aov?.start ?? d.approvalWindowStart;
                        const approvalEnd = aov?.end ?? d.approvalWindowEnd;
                        if (!approvalStart || !approvalEnd) return null;
                        return (
                          <div className="flex border-b border-neutral-100 bg-neutral-50/60">
                            <div
                              style={{ width: LABEL_COL_WIDTH }}
                              className="shrink-0 px-4 py-1.5 pl-8"
                            >
                              <p className="text-[11px] text-neutral-500">↳ Aprovação do cliente</p>
                            </div>
                            <GanttTrack
                              rangeStart={rangeStart}
                              rangeEnd={rangeEnd}
                              canEdit={canEdit}
                              variant="approval"
                              items={[
                                {
                                  key: `${d.id}-approval`,
                                  kind: "BAR",
                                  start: approvalStart,
                                  end: approvalEnd,
                                  colorHex: d.approvalColorHex,
                                  variant: "approval",
                                  titleText: `Aprovação: ${formatShortDate(approvalStart)} - ${formatShortDate(approvalEnd)}`,
                                  onPreview: (s, e) => previewApproval(d.id, s, e),
                                  onCommit: (s, e, fields) => stageApproval(d.id, s, e, fields),
                                },
                              ]}
                            />
                          </div>
                        );
                      })()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export type { DeliverableView };
