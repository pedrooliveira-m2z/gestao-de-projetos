export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
