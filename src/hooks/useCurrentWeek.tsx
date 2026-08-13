import { useEffect, useState } from "react";

function startOfISOWeek(d: Date) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0=Dom..6=Sáb
  const diff = (day + 6) % 7; // dias desde segunda
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isoWeekNumber(d: Date) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const diff = (tmp.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diff - ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

function compute() {
  const now = new Date();
  const weekStart = startOfISOWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekKey = `${weekStart.getFullYear()}-W${String(isoWeekNumber(weekStart)).padStart(2, "0")}`;
  return { now, weekStart, weekEnd, weekKey };
}

/**
 * Limites da semana corrente (segunda 00:00 → próxima segunda 00:00).
 * Reemite o estado quando a semana vira (checagem a cada 60s).
 */
export function useCurrentWeek() {
  const [state, setState] = useState(compute);

  useEffect(() => {
    const id = setInterval(() => {
      const next = compute();
      setState((prev) => (prev.weekKey === next.weekKey ? prev : next));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return state;
}
