export function formatShortDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

export function formatFullDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatWeekday(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
