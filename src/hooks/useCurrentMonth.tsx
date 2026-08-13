import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { monthRange, previousMonthRange } from "@/lib/dateRanges";

function compute() {
  const now = new Date();
  const current = monthRange(now);
  const previous = previousMonthRange(now);
  return {
    now,
    monthStart: current.start,
    // exclusivo: primeiro instante do mês seguinte
    monthEnd: current.nextStart,
    previousStart: previous.start,
    previousEnd: previous.end,
    monthKey: current.key,
  };
}


// Garante que o rollover de metas mensais rode ao menos uma vez por sessão
// e novamente quando o mês virar. É barato — só fecha metas vencidas.
const rolledOverKeys = new Set<string>();
async function triggerRollover(monthKey: string) {
  if (rolledOverKeys.has(monthKey)) return;
  rolledOverKeys.add(monthKey);
  try {
    await supabase.rpc("rollover_monthly_goals" as never);
  } catch {
    // silencioso
  }
}

/**
 * Retorna os limites do mês corrente e recalcula automaticamente
 * quando o mês vira (checa a cada 60s). Também dispara o rollover
 * de metas mensais vencidas no servidor.
 */
export function useCurrentMonth() {
  const [state, setState] = useState(compute);

  useEffect(() => {
    triggerRollover(state.monthKey);
    const id = setInterval(() => {
      const next = compute();
      setState((prev) => {
        if (prev.monthKey === next.monthKey) return prev;
        triggerRollover(next.monthKey);
        return next;
      });
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
