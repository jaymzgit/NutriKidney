/**
 * Meal streak computation — pure functions, no I/O.
 *
 * A day counts as "logged" when at least one meal exists for it (local date).
 *
 * Rules:
 * - Streaks run on **local calendar days**, not rolling 24h windows.
 * - Today is *pending* until a meal is logged: a day with no meal yet does
 *   NOT break the streak before midnight (it only breaks after the day ends).
 * - Deleting a meal auto-updates streaks because everything is derived from
 *   the meal list — nothing is stored.
 *
 * Used by the Home badge (app/(tabs)/index.tsx) and the streak dashboard
 * (app/streak.tsx).
 */

export type StreakStats = {
  /** Consecutive logged days ending today, or ending yesterday when today is still pending. */
  current: number;
  /** Longest run of consecutive logged days in the loaded history. */
  longest: number;
  /** Total distinct logged days in the loaded history. */
  totalDays: number;
  /** Local date keys ("YYYY-MM-DD") of every logged day — for calendars/heatmaps. */
  loggedDays: Set<string>;
  /** Today (local) has at least one meal. */
  todayLogged: boolean;
  /** Today isn't logged yet, but the streak is still alive. */
  todayPending: boolean;
};

/** Local calendar day key: "2026-10-07". */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a "YYYY-MM-DD" key as a local date (avoids UTC shift from `new Date(str)`). */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Compute streak stats from meal rows.
 * @param meals rows exposing a `logged_at` ISO timestamp
 * @param now   injectable clock (tests pass a fixed date)
 */
export function computeStreaks(
  meals: { logged_at: string }[],
  now: Date = new Date()
): StreakStats {
  const loggedDays = new Set<string>();
  for (const m of meals) {
    const t = new Date(m.logged_at);
    if (!isNaN(t.getTime())) loggedDays.add(dayKey(t));
  }

  const todayKey = dayKey(now);
  const todayLogged = loggedDays.has(todayKey);

  // Current streak: walk back from today — or from yesterday when today is
  // still pending, so an unlogged morning doesn't zero the streak.
  let current = 0;
  let cursor = todayLogged ? todayKey : dayKey(addDays(keyToDate(todayKey), -1));
  while (loggedDays.has(cursor)) {
    current++;
    cursor = dayKey(addDays(keyToDate(cursor), -1));
  }

  // Longest run + totals over the loaded history.
  const sorted = Array.from(loggedDays).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    run = prev !== null && dayKey(addDays(keyToDate(prev), 1)) === key ? run + 1 : 1;
    prev = key;
    if (run > longest) longest = run;
  }

  return {
    current,
    longest,
    totalDays: loggedDays.size,
    loggedDays,
    todayLogged,
    todayPending: !todayLogged && current > 0,
  };
}

/** Calendar month view data for the streak dashboard. */
export type CalendarCell = {
  key: string;
  day: number;
  logged: boolean;
  isToday: boolean;
  /** Future days — not yet winnable. */
  isFuture: boolean;
};

/** Days for a month grid (Mon-first), padded with nulls before/after the month. */
export function buildMonthGrid(
  year: number,
  monthIndex: number,
  loggedDays: Set<string>,
  now: Date = new Date()
): (CalendarCell | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const todayKey = dayKey(now);
  // JS getDay(): 0=Sun … 6=Sat → shift to Mon-first (0=Mon … 6=Sun).
  const lead = (first.getDay() + 6) % 7;

  const cells: (CalendarCell | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKey(new Date(year, monthIndex, d));
    cells.push({
      key,
      day: d,
      logged: loggedDays.has(key),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function addDays(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
}
