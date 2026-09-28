"use client";

import { useRef, useState, useTransition } from "react";
import type { FrontView, DeliverableView } from "@/lib/project-data";
import { formatShortDate } from "@/lib/format";
import { updateDeliverableDatesAction } from "@/app/admin/actions";

const LABEL_COL_WIDTH = 260;
const DAY_MS = 24 * 60 * 60 * 1000;

function pct(date: Date, start: Date, end: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, ((date.getTime() - start.getTime()) / total) * 100));
}

function weeklyTicks(start: Date, end: Date): Date[] {
  const ticks: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    ticks.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return ticks;
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
type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  mode: DragMode;
  startX: number;
  origStart: number;
  origEnd: number;
  lastStart: number;
  lastEnd: number;
}

/** A single BAR or MILESTONE mark, draggable (move/resize) when `canEdit` is true. */
function DeliverableBar({
  kind,
  start,
  end,
  rangeStart,
  rangeEnd,
  colorHex,
  canEdit,
  titleText,
  onPreview,
  onCommit,
}: {
  kind: "BAR" | "MILESTONE";
  start: Date | null;
  end: Date | null;
  rangeStart: Date;
  rangeEnd: Date;
  colorHex: string;
  canEdit: boolean;
  titleText: string;
  onPreview: (start: Date, end: Date) => void;
  onCommit: (start: Date, end: Date, fields: DragFields) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
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

  return (
    <div ref={trackRef} className="relative flex-1 py-2">
      {kind === "MILESTONE" && end ? (
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45"
          style={{
            left: `${pct(end, rangeStart, rangeEnd)}%`,
            backgroundColor: colorHex,
            cursor: canEdit ? "grab" : undefined,
            touchAction: "none",
          }}
          onPointerDown={beginDrag("move")}
          {...dragEvents}
          title={titleText}
        />
      ) : (
        start &&
        end && (
          <div
            className="absolute top-1/2 h-4 -translate-y-1/2 rounded-sm"
            style={{
              left: `${pct(start, rangeStart, rangeEnd)}%`,
              width: `${Math.max(0.6, pct(end, rangeStart, rangeEnd) - pct(start, rangeStart, rangeEnd))}%`,
              backgroundColor: colorHex,
              cursor: canEdit ? "grab" : undefined,
              touchAction: "none",
            }}
            onPointerDown={beginDrag("move")}
            {...dragEvents}
            title={titleText}
          >
            {canEdit && (
              <>
                <div
                  className="absolute -left-1 top-0 h-full w-2.5 cursor-ew-resize"
                  style={{ touchAction: "none" }}
                  onPointerDown={beginDrag("resize-start")}
                  {...dragEvents}
                />
                <div
                  className="absolute -right-1 top-0 h-full w-2.5 cursor-ew-resize"
                  style={{ touchAction: "none" }}
                  onPointerDown={beginDrag("resize-end")}
                  {...dragEvents}
                />
              </>
            )}
          </div>
        )
      )}
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
  const [, startSaving] = useTransition();

  const allDates = fronts
    .flatMap((f) => f.deliverables)
    .flatMap((d) => [d.ganttStart, d.approvalWindowStart, d.ganttEnd])
    .filter((d): d is Date => !!d);
  allDates.push(cutoffDate);

  if (allDates.length === 0) {
    return <p className="text-sm text-neutral-500">Sem dados suficientes para montar o Gantt.</p>;
  }

  const rangeStart = new Date(Math.min(...allDates.map((d) => d.getTime())));
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 3);
  const rangeEnd = new Date(Math.max(...allDates.map((d) => d.getTime())));
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 3);

  const ticks = weeklyTicks(rangeStart, rangeEnd);
  const days = enumerateDays(rangeStart, rangeEnd);
  const todayPct = pct(cutoffDate, rangeStart, rangeEnd);

  function previewDates(deliverableId: string, start: Date, end: Date) {
    setOverrides((prev) => ({ ...prev, [deliverableId]: { start, end } }));
  }

  function commitDates(deliverableId: string, start: Date, end: Date, fields: DragFields) {
    const payload: { startDateOverride?: string | null; endDateOverride?: string | null } = {};
    if (fields === "both" || fields === "start") payload.startDateOverride = start.toISOString();
    if (fields === "both" || fields === "end") payload.endDateOverride = end.toISOString();
    startSaving(async () => {
      await updateDeliverableDatesAction(projectId, deliverableId, payload);
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[deliverableId];
        return next;
      });
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      {canEdit && (
        <p className="border-b border-neutral-100 bg-neutral-50 px-4 py-1.5 text-[11px] text-neutral-500">
          Arraste as barras para mover, ou as bordas para redimensionar.
        </p>
      )}
      <div style={{ minWidth: LABEL_COL_WIDTH + ticks.length * 90 }}>
        {/* Timeline header */}
        <div className="relative flex border-b border-neutral-200 bg-[#0b0e14] text-white">
          <div style={{ width: LABEL_COL_WIDTH }} className="shrink-0 px-4 py-2 text-xs font-semibold uppercase">
            Frente / entrega
          </div>
          <div className="relative flex-1">
            <div className="flex h-full">
              {ticks.map((tick, i) => (
                <div
                  key={i}
                  className="flex-1 border-l border-white/10 px-1.5 py-2 text-[11px] text-neutral-300"
                >
                  {formatShortDate(tick)}
                </div>
              ))}
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

          {fronts.map((front) => (
            <div key={front.id}>
              <div
                className="flex items-center gap-2 border-b border-neutral-200 px-4 py-1.5 text-xs font-bold text-white uppercase"
                style={{ backgroundColor: front.colorHex }}
              >
                {front.vendorName} — {front.name}
              </div>
              {front.deliverables.map((d) => {
                const ov = overrides[d.id];
                const ganttStart = ov?.start ?? d.ganttStart;
                const ganttEnd = ov?.end ?? d.ganttEnd;
                return (
                  <div key={d.id}>
                    <div className="flex border-b border-neutral-100">
                      <div style={{ width: LABEL_COL_WIDTH }} className="shrink-0 px-4 py-2">
                        <p className="text-sm font-medium text-neutral-800">{d.name}</p>
                        {d.ruleLabel && <p className="text-[11px] text-neutral-400">{d.ruleLabel}</p>}
                      </div>
                      <DeliverableBar
                        kind={d.kind}
                        start={ganttStart}
                        end={ganttEnd}
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        colorHex={d.colorHex}
                        canEdit={canEdit}
                        titleText={
                          d.kind === "MILESTONE" && ganttEnd
                            ? formatShortDate(ganttEnd)
                            : ganttStart && ganttEnd
                              ? `${formatShortDate(ganttStart)} - ${formatShortDate(ganttEnd)}`
                              : ""
                        }
                        onPreview={(s, e) => previewDates(d.id, s, e)}
                        onCommit={(s, e, fields) => commitDates(d.id, s, e, fields)}
                      />
                    </div>
                    {d.hasApprovalWindow && d.approvalWindowStart && d.ganttEnd && (
                      <div className="flex border-b border-neutral-100 bg-neutral-50/60">
                        <div style={{ width: LABEL_COL_WIDTH }} className="shrink-0 px-4 py-1.5 pl-8">
                          <p className="text-[11px] text-neutral-500">↳ Aprovação do cliente</p>
                        </div>
                        <div className="relative flex-1 py-1.5">
                          <div
                            className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm border border-dashed border-neutral-400 bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.12)_0,rgba(0,0,0,0.12)_2px,transparent_2px,transparent_6px)]"
                            style={{
                              left: `${pct(d.approvalWindowStart, rangeStart, rangeEnd)}%`,
                              width: `${Math.max(
                                0.6,
                                pct(d.ganttEnd, rangeStart, rangeEnd) -
                                  pct(d.approvalWindowStart, rangeStart, rangeEnd)
                              )}%`,
                            }}
                            title={`Aprovação: ${formatShortDate(d.approvalWindowStart)} - ${formatShortDate(d.ganttEnd)}`}
                          />
                        </div>
                      </div>
                    )}
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
