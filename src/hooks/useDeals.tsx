import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";


export interface DbDeal {
  id: string;
  user_id: string;
  contact_name: string;
  company_name: string;
  value: number;
  stage: string;
  priority: string;
  section_id: string | null;
  source: string;
  contact_phone: string | null;
  contact_email: string | null;
  description: string | null;
  next_action_at: string | null;
  meeting_at: string | null;
  client_id: string | null;
  closed_by_user_id: string | null;
  closed_by_role: "sdr" | "closer" | "admin" | null;
  converted_at: string | null;
  created_at: string;
  closed_at: string | null;
  was_lost: boolean;
  recovered_at: string | null;
  // joined
  responsible_name?: string;
  closed_by_name?: string;
}

export interface DbActivity {
  id: string;
  user_id: string;
  type: string;
  deal_id: string | null;
  notes: string | null;
  created_at: string;
}

interface UseDealsOptions {
  sectionId?: string | null;
  includeClosed?: boolean;
}

export function useDeals(
  optionsOrSectionId?: UseDealsOptions | string | null,
) {
  const { user, roles } = useAuth();
  const [deals, setDeals] = useState<DbDeal[]>([]);
  const [loading, setLoading] = useState(true);

  // Backwards-compat: aceita string|null como sectionId direto
  const opts: UseDealsOptions =
    typeof optionsOrSectionId === "object" && optionsOrSectionId !== null
      ? optionsOrSectionId
      : { sectionId: (optionsOrSectionId as string | null) ?? null };

  const sectionId = opts.sectionId ?? null;
  const includeClosed = opts.includeClosed ?? false;

  const fetchDeals = useCallback(async () => {
    if (!user) {
      setDeals([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      let query = supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false });

      if (sectionId) query = query.eq("section_id", sectionId);
      if (!includeClosed) {
        query = query.not("stage", "in", "(fechado_ganho,fechado_perdido)");
      }

      const { data: dealsData, error } = await query;

      if (error || !dealsData) {
        setDeals([]);
        return;
      }

      // Buscar profiles para responsáveis e quem fechou
      const userIds = new Set<string>();
      (dealsData as DbDeal[]).forEach((d) => {
        if (d.user_id) userIds.add(d.user_id);
        if (d.closed_by_user_id) userIds.add(d.closed_by_user_id);
      });

      const profileMap = new Map<string, string>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(userIds));
        profiles?.forEach((p) => profileMap.set(p.id, p.full_name));
      }

      const mapped: DbDeal[] = (dealsData as DbDeal[]).map((d) => ({
        ...d,
        responsible_name: profileMap.get(d.user_id) ?? "Sem responsável",
        closed_by_name: d.closed_by_user_id
          ? profileMap.get(d.closed_by_user_id)
          : undefined,
      }));

      setDeals(mapped);
    } finally {
      setLoading(false);
    }
  }, [user, sectionId, includeClosed]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  useRealtimeTables(["deals"], fetchDeals, !!user);


  const createDeal = async (
    deal: Partial<
      Omit<
        DbDeal,
        | "id"
        | "created_at"
        | "closed_at"
        | "user_id"
        | "responsible_name"
        | "closed_by_name"
        | "closed_by_user_id"
        | "converted_at"
      >
    > & {
      contact_name: string;
      company_name: string;
      stage: string;
    },
  ) => {
    if (!user) return { error: "Not authenticated" };
    const isWon = deal.stage === "fechado_ganho";
    const sellerRoles = roles.filter((r) => r === "sdr" || r === "closer");
    const autoRole = sellerRoles.length === 1 ? sellerRoles[0] : null;
    const { error } = await supabase.from("deals").insert({
      contact_name: deal.contact_name,
      company_name: deal.company_name,
      value: deal.value ?? 0,
      stage: deal.stage,
      priority: deal.priority ?? "medium",
      section_id: deal.section_id ?? null,
      source: deal.source ?? "organico",
      contact_phone: deal.contact_phone ?? null,
      contact_email: deal.contact_email ?? null,
      description: deal.description ?? null,
      next_action_at: deal.next_action_at ?? null,
      meeting_at: deal.meeting_at ?? null,
      client_id: deal.client_id ?? null,
      user_id: user.id,
      ...(isWon
        ? {
            closed_at: new Date().toISOString(),
            closed_by_user_id: user.id,
            closed_by_role: deal.closed_by_role ?? autoRole,
            converted_at: new Date().toISOString(),
          }
        : {}),
    });
    if (!error) await fetchDeals();
    return { error: error?.message ?? null };
  };

  const updateDeal = async (
    id: string,
    updates: Partial<Omit<DbDeal, "responsible_name" | "closed_by_name">>,
  ) => {
    const {
      responsible_name: _responsibleName,
      closed_by_name: _closedByName,
      ...rest
    } = updates as Partial<DbDeal>;

    const sellerRoles = roles.filter((r) => r === "sdr" || r === "closer");
    const autoRole = sellerRoles.length === 1 ? sellerRoles[0] : null;
    const isAdmin = roles.includes("admin");

    // Se está movendo para fechado_ganho, registra automaticamente
    // (mas respeita closed_by_user_id se o admin já enviou explicitamente)
    if (rest.stage === "fechado_ganho" && user) {
      const current = deals.find((d) => d.id === id);
      if (!current || current.stage !== "fechado_ganho") {
        rest.closed_at = rest.closed_at ?? new Date().toISOString();
        rest.converted_at = new Date().toISOString();
        if (rest.closed_by_user_id === undefined) {
          const ownerIsOther =
            isAdmin && current && current.user_id && current.user_id !== user.id;
          rest.closed_by_user_id = ownerIsOther ? current!.user_id : user.id;
          if (rest.closed_by_role === undefined) {
            rest.closed_by_role = ownerIsOther ? null : autoRole;
          }
        }
      }
    }
    if (rest.stage === "fechado_perdido" && user) {
      const current = deals.find((d) => d.id === id);
      if (!current || current.stage !== "fechado_perdido") {
        rest.closed_at = rest.closed_at ?? new Date().toISOString();
        if (rest.closed_by_user_id === undefined) {
          const ownerIsOther =
            isAdmin && current && current.user_id && current.user_id !== user.id;
          rest.closed_by_user_id = ownerIsOther ? current!.user_id : user.id;
          if (rest.closed_by_role === undefined) {
            rest.closed_by_role = ownerIsOther ? null : autoRole;
          }
        }
      }
    }

    const previousStage = deals.find((d) => d.id === id)?.stage;
    const { error } = await supabase.from("deals").update(rest).eq("id", id);
    if (!error) {
      // Auto-registrar atividade quando o estágio muda
      if (rest.stage && rest.stage !== previousStage && user) {
        const stageToActivity: Record<string, string> = {
          contato: "call",
          proposta: "proposal",
          fechamento: "meeting",
          fechado_ganho: "won",
        };
        const activityType = stageToActivity[rest.stage as string];
        if (activityType) {
          // Evitar duplicar a mesma atividade no mesmo dia
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const { data: existing } = await supabase
            .from("activities")
            .select("id")
            .eq("deal_id", id)
            .eq("type", activityType)
            .eq("user_id", user.id)
            .gte("created_at", todayStart.toISOString())
            .limit(1);
          if (!existing || existing.length === 0) {
            await supabase.from("activities").insert({
              user_id: user.id,
              deal_id: id,
              type: activityType,
              notes: null,
            });
          }
        }
      }
      await fetchDeals();
    }
    return { error: error?.message ?? null };
  };

  const deleteDeal = async (id: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (!error) await fetchDeals();
    return { error: error?.message ?? null };
  };

  return { deals, loading, fetchDeals, createDeal, updateDeal, deleteDeal };
}

export function useActivities() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<DbActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false });
      setActivities((data as DbActivity[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);


  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const createActivity = async (activity: { type: string; deal_id?: string | null; notes?: string }) => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await supabase.from("activities").insert({
      ...activity,
      user_id: user.id,
    });
    if (!error) await fetchActivities();
    return { error: error?.message ?? null };
  };

  return { activities, loading, fetchActivities, createActivity };
}
