import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";
import { useCurrentMonth } from "@/hooks/useCurrentMonth";


export interface MrrMonth {
  key: string; // YYYY-MM
  label: string;
  year: number;
  month: number;
  newClients: number;
  churnedClients: number;
  newMrr: number;
  lostMrr: number;
  missedMrr: number;
  netMrr: number;
}

export interface MrrMetrics {
  loading: boolean;
  current: MrrMonth;
  series: MrrMonth[];
  result: "positivo" | "neutro" | "negativo";
}

interface DealRow {
  client_id: string | null;
  value: number | string;
  stage: string;
  closed_at: string | null;
}


interface ClientRow {
  id: string;
  monthly_revenue: number | string | null;
  status: string;
  churned_at: string | null;
}

const monthLabel = (m: number) =>
  ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][m];

export function useMrrMetrics(monthsBack: number = 6): MrrMetrics {
  const { monthKey } = useCurrentMonth();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [churned, setChurned] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);


  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, clientsRes] = await Promise.all([
        supabase
          .from("deals")
          .select("client_id, value, stage, closed_at")
          .in("stage", ["fechado_ganho", "fechado_perdido"])
          .not("closed_at", "is", null),
        supabase
          .from("clients")
          .select("id, monthly_revenue, status, churned_at")
          .neq("status", "ativo")
          .not("churned_at", "is", null),
      ]);
      setDeals((dealsRes.data as DealRow[]) ?? []);
      setChurned((clientsRes.data as ClientRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useRealtimeTables(["deals", "clients"], fetchAll);

  const series = useMemo<MrrMonth[]>(() => {
    const [currentYear, currentMonth] = monthKey.split("-").map(Number);
    const now = new Date(currentYear, currentMonth - 1, 1);
    const months: MrrMonth[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();


      const wonClients = new Set<string>();
      let newMrr = 0;
      let missedMrr = 0;
      let lostMrr = 0;
      let churnedCount = 0;

      for (const dl of deals) {
        if (!dl.closed_at) continue;
        const dt = new Date(dl.closed_at);
        if (dt.getFullYear() !== y || dt.getMonth() !== m) continue;
        const v = Number(dl.value) || 0;
        if (dl.stage === "fechado_ganho") {
          newMrr += v;
          if (dl.client_id) wonClients.add(dl.client_id);
        } else if (dl.stage === "fechado_perdido") {
          missedMrr += v;
        }
      }

      for (const c of churned) {
        if (!c.churned_at) continue;
        // Parse as local date to avoid UTC shifting (e.g. "2026-07-01" -> June in UTC-3)
        const [cy, cm] = c.churned_at.slice(0, 10).split("-").map(Number);
        if (cy !== y || cm - 1 !== m) continue;
        churnedCount += 1;
        lostMrr += Number(c.monthly_revenue) || 0;
      }

      months.push({
        key: `${y}-${String(m + 1).padStart(2, "0")}`,
        label: monthLabel(m),
        year: y,
        month: m,
        newClients: wonClients.size,
        churnedClients: churnedCount,
        newMrr,
        lostMrr,
        missedMrr,
        netMrr: newMrr - lostMrr,
      });
    }
    return months;
  }, [deals, churned, monthsBack, monthKey]);



  const current = series[series.length - 1] ?? {
    key: "",
    label: "",
    year: 0,
    month: 0,
    newClients: 0,
    churnedClients: 0,
    newMrr: 0,
    lostMrr: 0,
    missedMrr: 0,
    netMrr: 0,
  };

  const result: MrrMetrics["result"] =
    current.netMrr > 0 ? "positivo" : current.netMrr < 0 ? "negativo" : "neutro";

  return { loading, current, series, result };
}
