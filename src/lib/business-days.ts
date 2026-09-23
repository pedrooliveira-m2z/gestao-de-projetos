// Business-day math for Brazilian national holidays (seg-sex, descontando feriados nacionais).

function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** National fixed + movable holidays for a given year (Brazil). */
export function brazilianNationalHolidays(year: number): Set<string> {
  const fixed = [
    [0, 1], // Confraternização Universal
    [3, 21], // Tiradentes
    [4, 1], // Dia do Trabalho
    [8, 7], // Independência
    [9, 12], // Nossa Senhora Aparecida
    [10, 2], // Finados
    [10, 15], // Proclamação da República
    [10, 20], // Consciência Negra (feriado nacional desde 2023)
    [11, 25], // Natal
  ] as const;

  const holidays = new Set<string>();
  for (const [month, day] of fixed) {
    holidays.add(dateKey(new Date(Date.UTC(year, month, day))));
  }

  const easter = easterSunday(year);
  holidays.add(dateKey(addDays(easter, -48))); // Carnaval (terça)
  holidays.add(dateKey(addDays(easter, -47))); // Carnaval (quarta, ponto facultativo até meio-dia — tratado como não útil)
  holidays.add(dateKey(addDays(easter, -2))); // Sexta-feira Santa
  holidays.add(dateKey(addDays(easter, 60))); // Corpus Christi

  return holidays;
}

const holidayCache = new Map<number, Set<string>>();
function isHoliday(d: Date): boolean {
  const year = d.getUTCFullYear();
  if (!holidayCache.has(year)) {
    holidayCache.set(year, brazilianNationalHolidays(year));
  }
  return holidayCache.get(year)!.has(dateKey(d));
}

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export function isBusinessDay(d: Date): boolean {
  return !isWeekend(d) && !isHoliday(d);
}

/** Adds N business days (seg-sex, sem feriados nacionais) to a date. */
export function addBusinessDays(start: Date, days: number): Date {
  let cursor = new Date(start);
  let remaining = days;
  const step = remaining >= 0 ? 1 : -1;
  remaining = Math.abs(remaining);
  while (remaining > 0) {
    cursor = addDays(cursor, step);
    if (isBusinessDay(cursor)) {
      remaining -= 1;
    }
  }
  return cursor;
}

/** Adds N calendar days to a date. */
export function addCalendarDays(start: Date, days: number): Date {
  return addDays(start, days);
}

export function countBusinessDaysBetween(start: Date, end: Date): number {
  if (end < start) return -countBusinessDaysBetween(end, start);
  let cursor = new Date(start);
  let count = 0;
  while (cursor < end) {
    cursor = addDays(cursor, 1);
    if (isBusinessDay(cursor)) count += 1;
  }
  return count;
}
