import { STATUS_STYLE } from "@/lib/colors";
import type { DeliverableStatus } from "@/lib/sla";

export function StatusBadge({
  status,
  label,
}: {
  status: DeliverableStatus;
  label: string;
}) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
      {label}
    </span>
  );
}
