import type { FrontView } from "@/lib/project-data";
import { formatShortDate } from "@/lib/format";

const LABEL_COL_WIDTH = 260;

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

export function GanttChart({
  fronts,
  cutoffDate,
}: {
  fronts: FrontView[];
  cutoffDate: Date;
}) {
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
  const todayPct = pct(cutoffDate, rangeStart, rangeEnd);

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
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
          {/* Today line spans the whole body */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-red-500"
            style={{ left: `calc(${LABEL_COL_WIDTH}px + (100% - ${LABEL_COL_WIDTH}px) * ${todayPct / 100})` }}
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
              {front.deliverables.map((d) => (
                <div key={d.id} className="flex border-b border-neutral-100">
                  <div style={{ width: LABEL_COL_WIDTH }} className="shrink-0 px-4 py-2">
                    <p className="text-sm font-medium text-neutral-800">{d.name}</p>
                    {d.ruleLabel && <p className="text-[11px] text-neutral-400">{d.ruleLabel}</p>}
                  </div>
                  <div className="relative flex-1 py-2">
                    {d.kind === "MILESTONE" && d.ganttEnd ? (
                      <div
                        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45"
                        style={{
                          left: `${pct(d.ganttEnd, rangeStart, rangeEnd)}%`,
                          backgroundColor: front.colorHex,
                        }}
                        title={formatShortDate(d.ganttEnd)}
                      />
                    ) : (
                      d.ganttStart &&
                      d.ganttEnd && (
                        <>
                          <div
                            className="absolute top-1/2 h-4 -translate-y-1/2 rounded-sm"
                            style={{
                              left: `${pct(d.ganttStart, rangeStart, rangeEnd)}%`,
                              width: `${Math.max(
                                0.6,
                                pct(d.ganttEnd, rangeStart, rangeEnd) - pct(d.ganttStart, rangeStart, rangeEnd)
                              )}%`,
                              backgroundColor: front.colorHex,
                            }}
                            title={`${formatShortDate(d.ganttStart)} - ${formatShortDate(d.ganttEnd)}`}
                          />
                          {d.hasApprovalWindow && d.approvalWindowStart && (
                            <div
                              className="absolute top-1/2 h-4 -translate-y-1/2 rounded-sm border border-dashed border-neutral-500 bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.15)_0,rgba(0,0,0,0.15)_2px,transparent_2px,transparent_6px)] text-[9px] leading-4 font-semibold text-neutral-700"
                              style={{
                                left: `${pct(d.approvalWindowStart, rangeStart, rangeEnd)}%`,
                                width: `${Math.max(
                                  0.6,
                                  pct(d.ganttEnd, rangeStart, rangeEnd) -
                                    pct(d.approvalWindowStart, rangeStart, rangeEnd)
                                )}%`,
                              }}
                            >
                              <span className="pl-1">aprovação</span>
                            </div>
                          )}
                        </>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
