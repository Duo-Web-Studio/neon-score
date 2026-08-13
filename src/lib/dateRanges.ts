/**
 * Helpers de período (mês/dia) usados em toda a plataforma.
 * Centralizados aqui para evitar reimplementações divergentes.
 */

export interface MonthRange {
  /** Primeiro instante do mês (dia 1, 00:00:00.000). */
  start: Date;
  /** Último instante do mês (último dia, 23:59:59.999). */
  end: Date;
  /** Primeiro instante do mês seguinte — útil para comparações `< nextStart`. */
  nextStart: Date;
  /** Chave estável no formato `YYYY-MM`. */
  key: string;
}

/** Início do mês da data informada. */
export function startOfMonthLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Fim do mês da data informada (último dia, 23:59:59.999). */
export function endOfMonthLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Chave `YYYY-MM` da data informada. */
export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Quantidade de dias do mês da data informada. */
export function daysInMonthOf(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Faixa completa do mês da data informada. */
export function monthRange(date: Date): MonthRange {
  return {
    start: startOfMonthLocal(date),
    end: endOfMonthLocal(date),
    nextStart: new Date(date.getFullYear(), date.getMonth() + 1, 1),
    key: monthKeyOf(date),
  };
}

/** Faixa do mês anterior ao da data informada. */
export function previousMonthRange(date: Date): MonthRange {
  return monthRange(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

/** Início do dia (00:00:00.000) da data informada. */
export function startOfDayLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Verifica se uma data ISO (possivelmente nula) está dentro de `[start, end)`.
 * Retorna `false` para valores nulos ou inválidos.
 */
export function isIsoWithin(
  iso: string | null | undefined,
  start: Date,
  end: Date,
): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return time >= start.getTime() && time < end.getTime();
}
