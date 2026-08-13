import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";


export interface CommissionRate {
  id: string;
  scope: "global" | "role" | "user";
  role: "admin" | "sdr" | "closer" | null;
  user_id: string | null;
  percentage: number;
  updated_at: string;
  updated_by: string;
}

const DEFAULT_RATE = 10;
// Closer ganha sobre SDR quando vendedor tem ambos os roles
const ROLE_PRIORITY: Array<"closer" | "sdr"> = ["closer", "sdr"];

export function useCommissionRates() {
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("commission_rates").select("*");
      setRates((data as CommissionRate[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  useRealtimeTables(["commission_rates"], fetchRates);


  const { userRateMap, roleRateMap, globalRate } = useMemo(() => {
    const userMap = new Map<string, number>();
    const roleMap = new Map<string, number>();
    let global: number | null = null;
    rates.forEach((r) => {
      if (r.scope === "user" && r.user_id) userMap.set(r.user_id, Number(r.percentage));
      else if (r.scope === "role" && r.role) roleMap.set(r.role, Number(r.percentage));
      else if (r.scope === "global") global = Number(r.percentage);
    });
    return { userRateMap: userMap, roleRateMap: roleMap, globalRate: global };
  }, [rates]);

  const getRate = useCallback(
    (userId: string | null | undefined, userRoles: string[] = []): number => {
      if (userId && userRateMap.has(userId)) return userRateMap.get(userId)!;
      for (const r of ROLE_PRIORITY) {
        if (userRoles.includes(r) && roleRateMap.has(r)) return roleRateMap.get(r)!;
      }
      return globalRate ?? DEFAULT_RATE;
    },
    [userRateMap, roleRateMap, globalRate],
  );

  return { rates, loading, getRate, fetchRates, globalRate, roleRateMap, userRateMap };
}
