import { supabase } from "@/integrations/supabase/client";

export interface SuspectedDuplicate {
  id: string;
  contact_name: string;
  company_name: string;
  value: number;
  closed_at: string | null;
  closed_by_user_id: string | null;
  closed_by_name?: string;
}

interface FindArgs {
  client_id?: string | null;
  company_name?: string | null;
  value: number;
  /** id do deal atual (quando se trata de UPDATE / movimentação no pipeline) */
  excludeId?: string | null;
  /** janela em dias — padrão 7 */
  windowDays?: number;
}

/**
 * Busca vendas já fechadas (fechado_ganho) suspeitas de serem a mesma venda.
 * Critério: mesmo client_id OU mesmo company_name (case-insensitive),
 * mesmo `value` (centavo a centavo), nos últimos N dias.
 */
export async function findSuspectedDuplicates({
  client_id,
  company_name,
  value,
  excludeId,
  windowDays = 7,
}: FindArgs): Promise<SuspectedDuplicate[]> {
  if (!value || value <= 0) return [];

  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  let query = supabase
    .from("deals")
    .select(
      "id, contact_name, company_name, value, closed_at, closed_by_user_id, client_id, stage",
    )
    .eq("stage", "fechado_ganho")
    .eq("value", value)
    .gte("closed_at", since.toISOString())
    .order("closed_at", { ascending: false })
    .limit(20);

  if (excludeId) query = query.neq("id", excludeId);

  // OR: client_id match OR company_name match (case-insensitive)
  const orParts: string[] = [];
  if (client_id) orParts.push(`client_id.eq.${client_id}`);
  if (company_name && company_name.trim()) {
    // ilike escape de vírgula
    const safe = company_name.trim().replace(/,/g, "");
    orParts.push(`company_name.ilike.${safe}`);
  }
  if (orParts.length === 0) return [];
  query = query.or(orParts.join(","));

  const { data, error } = await query;
  if (error || !data) return [];

  // Buscar nomes dos closers
  const userIds = Array.from(
    new Set(
      data.map((d) => d.closed_by_user_id).filter(Boolean) as string[],
    ),
  );
  const nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    profiles?.forEach((p) => nameMap.set(p.id, p.full_name));
  }

  return data.map((d) => ({

    id: d.id,
    contact_name: d.contact_name,
    company_name: d.company_name,
    value: Number(d.value),
    closed_at: d.closed_at,
    closed_by_user_id: d.closed_by_user_id,
    closed_by_name: d.closed_by_user_id
      ? nameMap.get(d.closed_by_user_id)
      : undefined,
  }));
}
