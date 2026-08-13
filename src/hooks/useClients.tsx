import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";


export type ClientStatus = "ativo" | "perdido";

function normalizeStatus(s: string | null | undefined): ClientStatus {
  return s === "ativo" ? "ativo" : "perdido";
}

export interface DbClient {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  status: ClientStatus;
  monthly_revenue: number;
  activated_at: string | null;
  churned_at: string | null;
  churn_reason: string | null;
  churn_notes: string | null;
}

export function useClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<DbClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .order("name", { ascending: true });
      const rows = ((data as DbClient[]) ?? []).map((c) => ({
        ...c,
        status: normalizeStatus(c.status),
      }));
      setClients(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useRealtimeTables(["clients"], fetchClients);


  const createClient = async (client: {
    name: string;
    company?: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
  }): Promise<{ id: string | null; error: string | null }> => {
    if (!user) return { id: null, error: "Not authenticated" };
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: client.name,
        company: client.company ?? null,
        phone: client.phone ?? null,
        email: client.email ?? null,
        notes: client.notes ?? null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (!error) await fetchClients();
    return {
      id: (data as { id: string } | null)?.id ?? null,
      error: error?.message ?? null,
    };
  };

  const updateClient = async (
    id: string,
    updates: Partial<
      Pick<
        DbClient,
        | "name"
        | "company"
        | "phone"
        | "email"
        | "notes"
        | "status"
        | "monthly_revenue"
        | "activated_at"
        | "churned_at"
        | "churn_reason"
        | "churn_notes"
      >
    >,
  ) => {
    const payload = { ...updates } as typeof updates;
    if (payload.status === "perdido") {
      (payload as { status?: string }).status = "saiu" as ClientStatus;
    }
    const { error } = await supabase.from("clients").update(payload).eq("id", id);
    if (!error) await fetchClients();
    return { error: error?.message ?? null };
  };

  const deleteClient = async (
    id: string,
    options?: { cascadeDeals?: boolean },
  ) => {
    if (options?.cascadeDeals) {
      const { error: dealsError } = await supabase
        .from("deals")
        .delete()
        .eq("client_id", id);
      if (dealsError) return { error: dealsError.message };
    }
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (!error) await fetchClients();
    return { error: error?.message ?? null };
  };

  /** Busca por nome, empresa, telefone ou email (case-insensitive) */
  const searchClients = (term: string): DbClient[] => {
    if (!term.trim()) return clients;
    const t = term.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(t) ||
        (c.company ?? "").toLowerCase().includes(t) ||
        (c.phone ?? "").toLowerCase().includes(t) ||
        (c.email ?? "").toLowerCase().includes(t),
    );
  };

  /** Tenta achar um cliente existente usando dados do formulário */
  const findMatchingClient = (data: {
    company?: string;
    phone?: string;
    email?: string;
  }): DbClient | undefined => {
    const company = data.company?.trim().toLowerCase();
    const phone = data.phone?.replace(/\D/g, "");
    const email = data.email?.trim().toLowerCase();
    return clients.find((c) => {
      if (email && c.email && c.email.toLowerCase() === email) return true;
      if (phone && c.phone && c.phone.replace(/\D/g, "") === phone) return true;
      if (company && c.company && c.company.toLowerCase() === company) return true;
      return false;
    });
  };

  return {
    clients,
    loading,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    searchClients,
    findMatchingClient,
  };
}
