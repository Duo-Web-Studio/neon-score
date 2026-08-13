import { useEffect, useMemo, useState, useCallback } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCommissionRates } from "./useCommissionRates";

export interface CommissionPeriod {
  id: string;
  user_id: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;
  deals_count: number;
  revenue: number;
  commission_rate: number;
  commission_value: number;
  status: "closed" | "paid";
  closed_at: string | null;
  paid_at: string | null;
  user_name?: string;
}

export interface CurrentMonthCommission {
  user_id: string;
  user_name?: string;
  period_start: string;
  period_end: string;
  deals_count: number;
  revenue: number;
  commission_rate: number;
  commission_value: number;
  status: "open";
}

interface UseCommissionHistoryOptions {
  userId?: string | null; // if null/undefined and admin, fetch all
  scope?: "self" | "all";
}

export function useCommissionHistory({ userId, scope = "self" }: UseCommissionHistoryOptions = {}) {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const { getRate, loading: ratesLoading } = useCommissionRates();
  const [periods, setPeriods] = useState<CommissionPeriod[]>([]);
  const [currentMonths, setCurrentMonths] = useState<CurrentMonthCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [userRolesMap, setUserRolesMap] = useState<Record<string, string[]>>({});

  const targetUserId = scope === "self" ? user?.id : userId ?? null;

  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. períodos de comissão
      let query = supabase
        .from("commission_periods")
        .select("*")
        .order("period_start", { ascending: false });
      if (scope === "self") query = query.eq("user_id", user.id);
      else if (targetUserId) query = query.eq("user_id", targetUserId);
      const { data: periodsData } = await query;

      // 2. perfis + papéis (nomes e visão admin)
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, status"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const pmap: Record<string, string> = {};
      profilesRes.data?.forEach((p) => { pmap[p.id] = p.full_name; });
      setProfilesMap(pmap);
      const rmap: Record<string, string[]> = {};
      rolesRes.data?.forEach((r) => {
        rmap[r.user_id] = [...(rmap[r.user_id] ?? []), r.role];
      });
      setUserRolesMap(rmap);

      setPeriods(
        (periodsData ?? []).map((p) => ({
          ...p,
          status: p.status as CommissionPeriod["status"],
          revenue: Number(p.revenue),
          commission_rate: Number(p.commission_rate),
          commission_value: Number(p.commission_value),
          user_name: pmap[p.user_id],
        })),
      );

      // 3. mês corrente calculado a partir das deals
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      let userIds: string[] = [];
      if (scope === "self") {
        userIds = [user.id];
      } else if (targetUserId) {
        userIds = [targetUserId];
      } else if (isAdmin) {
        userIds = (profilesRes.data ?? [])
          .filter((p) => p.status === "approved")
          .map((p) => p.id);
      }

      const { data: dealsData } = await supabase
        .from("deals")
        .select("value, closed_at, closed_by_user_id, user_id")
        .eq("stage", "fechado_ganho")
        .gte("closed_at", monthStart.toISOString())
        .lte("closed_at", monthEnd.toISOString());

      const aggregates = new Map<string, { revenue: number; count: number }>();
      (dealsData ?? []).forEach((d) => {
        const uid = d.closed_by_user_id ?? d.user_id;
        if (!userIds.includes(uid)) return;
        const cur = aggregates.get(uid) ?? { revenue: 0, count: 0 };
        cur.revenue += Number(d.value);
        cur.count += 1;
        aggregates.set(uid, cur);
      });

      const cm: CurrentMonthCommission[] = userIds.map((uid) => {
        const agg = aggregates.get(uid) ?? { revenue: 0, count: 0 };
        const rate = getRate(uid, rmap[uid] ?? []);
        return {
          user_id: uid,
          user_name: pmap[uid],
          period_start: format(monthStart, "yyyy-MM-dd"),
          period_end: format(monthEnd, "yyyy-MM-dd"),
          deals_count: agg.count,
          revenue: agg.revenue,
          commission_rate: rate,
          commission_value: Math.round((agg.revenue * rate) / 100 * 100) / 100,
          status: "open",
        };
      });
      setCurrentMonths(cm);
    } finally {
      setLoading(false);
    }
  }, [user, scope, targetUserId, isAdmin, getRate]);


  useEffect(() => {
    if (!ratesLoading) fetchAll();
  }, [fetchAll, ratesLoading]);

  const totals = useMemo(() => {
    const closed = periods.filter((p) => p.status === "closed").reduce((a, p) => a + p.commission_value, 0);
    const paid = periods.filter((p) => p.status === "paid").reduce((a, p) => a + p.commission_value, 0);
    const open = currentMonths.reduce((a, p) => a + p.commission_value, 0);
    return { closed, paid, open, total: closed + paid + open };
  }, [periods, currentMonths]);

  return {
    periods,
    currentMonths,
    loading: loading || ratesLoading,
    totals,
    profilesMap,
    userRolesMap,
    refetch: fetchAll,
  };
}
