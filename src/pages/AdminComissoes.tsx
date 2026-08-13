import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { parseISO } from "date-fns";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCommissionRates } from "@/hooks/useCommissionRates";
import { toast } from "sonner";
import { Loader2, Percent, Save, Trash2, Users, History, PlayCircle } from "lucide-react";
import { CommissionHistoryTable } from "@/components/dashboard/CommissionHistoryTable";
import { CommissionHistoryFilters } from "@/components/dashboard/CommissionHistoryFilters";
import { CurrentCycleCard } from "@/components/dashboard/CurrentCycleCard";
import { PendingCommissionsCard } from "@/components/dashboard/PendingCommissionsCard";
import { useCommissionHistory } from "@/hooks/useCommissionHistory";
import { useCurrentMonth } from "@/hooks/useCurrentMonth";

type Role = "SDR" | "Closer";

const percentageSchema = z
  .number({ invalid_type_error: "Informe um número" })
  .min(0, "Mínimo 0%")
  .max(100, "Máximo 100%");

interface Profile {
  id: string;
  full_name: string;
  roles: string[];
}

function parsePct(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export default function AdminComissoes() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role>("Closer");
  const { rates, loading, globalRate, roleRateMap, userRateMap, fetchRates } = useCommissionRates();

  const [globalInput, setGlobalInput] = useState("");
  const [sdrInput, setSdrInput] = useState("");
  const [closerInput, setCloserInput] = useState("");
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setProfilesLoading(true);
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("status", "approved"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, string[]>();
      rolesRes.data?.forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      const list: Profile[] = (profilesRes.data ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        roles: roleMap.get(p.id) ?? [],
      }));
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setProfiles(list);
      setProfilesLoading(false);
    };
    load();
  }, []);

  // Sincronizar inputs com taxas carregadas
  useEffect(() => {
    setGlobalInput(globalRate != null ? String(globalRate) : "");
    setSdrInput(roleRateMap.has("sdr") ? String(roleRateMap.get("sdr")) : "");
    setCloserInput(roleRateMap.has("closer") ? String(roleRateMap.get("closer")) : "");
    const next: Record<string, string> = {};
    userRateMap.forEach((v, k) => {
      next[k] = String(v);
    });
    setUserInputs(next);
  }, [globalRate, roleRateMap, userRateMap]);

  const upsertRate = async (
    key: string,
    payload: { scope: "global" | "role" | "user"; role?: "sdr" | "closer"; user_id?: string; percentage: number },
  ) => {
    if (!user) return;
    const validation = percentageSchema.safeParse(payload.percentage);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    setSavingKey(key);
    // Buscar id existente para esse escopo
    const existing = rates.find((r) => {
      if (payload.scope === "global") return r.scope === "global";
      if (payload.scope === "role") return r.scope === "role" && r.role === payload.role;
      if (payload.scope === "user") return r.scope === "user" && r.user_id === payload.user_id;
      return false;
    });

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("commission_rates")
        .update({ percentage: payload.percentage, updated_by: user.id })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("commission_rates").insert({
        scope: payload.scope,
        role: payload.role ?? null,
        user_id: payload.user_id ?? null,
        percentage: payload.percentage,
        updated_by: user.id,
      }));
    }
    setSavingKey(null);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else {
      toast.success("Comissão atualizada");
      fetchRates();
    }
  };

  const deleteRate = async (key: string, finder: (r: typeof rates[number]) => boolean) => {
    const existing = rates.find(finder);
    if (!existing) return;
    setSavingKey(key);
    const { error } = await supabase.from("commission_rates").delete().eq("id", existing.id);
    setSavingKey(null);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Configuração removida");
      fetchRates();
    }
  };

  const handleSaveGlobal = () => {
    const v = parsePct(globalInput);
    if (v == null) return toast.error("Informe um valor válido");
    upsertRate("global", { scope: "global", percentage: v });
  };

  const handleSaveRole = (r: "sdr" | "closer", input: string) => {
    const v = parsePct(input);
    if (v == null) return toast.error("Informe um valor válido");
    upsertRate(`role-${r}`, { scope: "role", role: r, percentage: v });
  };

  const handleClearRole = (r: "sdr" | "closer") =>
    deleteRate(`role-${r}`, (x) => x.scope === "role" && x.role === r);

  const handleSaveUser = (uid: string) => {
    const v = parsePct(userInputs[uid] ?? "");
    if (v == null) return toast.error("Informe um valor válido");
    upsertRate(`user-${uid}`, { scope: "user", user_id: uid, percentage: v });
  };

  const handleClearUser = (uid: string) =>
    deleteRate(`user-${uid}`, (x) => x.scope === "user" && x.user_id === uid);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <FloatingHeader role={role} onRoleChange={setRole} />
          <main className="flex-1 px-4 pb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Comissões</h2>
              <p className="text-sm text-muted-foreground">
                Configure a porcentagem de comissão. Prioridade: vendedor → função → global.
              </p>
            </motion.div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Global */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Percent className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Comissão Global</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Aplicada quando não há configuração específica para a função ou vendedor.
                  </p>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 max-w-xs">
                      <Label htmlFor="global-pct" className="text-xs">Porcentagem (%)</Label>
                      <Input
                        id="global-pct"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={globalInput}
                        onChange={(e) => setGlobalInput(e.target.value)}
                        placeholder="10"
                      />
                    </div>
                    <Button onClick={handleSaveGlobal} disabled={savingKey === "global"} className="gap-1">
                      {savingKey === "global" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salvar
                    </Button>
                  </div>
                </div>

                {/* Por role */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-secondary" />
                    <h3 className="text-sm font-semibold text-foreground">Comissão por Função</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Sobrescreve a global. Closer tem prioridade quando o vendedor tem ambas as funções.
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {([
                      { key: "closer" as const, label: "Closer", input: closerInput, setter: setCloserInput },
                      { key: "sdr" as const, label: "SDR", input: sdrInput, setter: setSdrInput },
                    ]).map(({ key, label, input, setter }) => (
                      <div key={key} className="rounded-xl bg-muted/20 p-3">
                        <Label className="text-xs">{label} (%)</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={input}
                            onChange={(e) => setter(e.target.value)}
                            placeholder="—"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveRole(key, input)}
                            disabled={savingKey === `role-${key}`}
                          >
                            {savingKey === `role-${key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </Button>
                          {roleRateMap.has(key) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleClearRole(key)}
                              disabled={savingKey === `role-${key}`}
                              title="Remover configuração desta função"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Por vendedor */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-semibold text-foreground">Comissão por Vendedor</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Sobrescreve global e função. Deixe em branco para usar o fallback.
                  </p>
                  {profilesLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : profiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum vendedor aprovado encontrado.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {profiles.map((p) => {
                        const hasOverride = userRateMap.has(p.id);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 rounded-xl bg-muted/20 p-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {p.roles.map((r) => (
                                  <span
                                    key={r}
                                    className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={userInputs[p.id] ?? ""}
                              onChange={(e) =>
                                setUserInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                              placeholder="—"
                              className="w-24"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveUser(p.id)}
                              disabled={savingKey === `user-${p.id}`}
                            >
                              {savingKey === `user-${p.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            {hasOverride && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleClearUser(p.id)}
                                disabled={savingKey === `user-${p.id}`}
                                title="Remover configuração específica"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Histórico */}
                <CommissionHistorySection />
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function CommissionHistorySection() {
  const { periods, currentMonths, loading, totals, refetch } = useCommissionHistory({ scope: "all" });
  const [closing, setClosing] = useState(false);

  const { monthKey } = useCurrentMonth();
  const currentYear = Number(monthKey.split("-")[0]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const availableYears = useMemo(() => {
    const ys = new Set<number>(periods.map((p) => parseISO(p.period_start).getFullYear()));
    ys.add(currentYear);
    return Array.from(ys).sort((a, b) => b - a);
  }, [periods, currentYear]);

  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => {
      const d = parseISO(p.period_start);
      if (d.getFullYear() !== selectedYear) return false;
      if (selectedMonth !== "all" && d.getMonth() !== selectedMonth) return false;
      return true;
    });
  }, [periods, selectedYear, selectedMonth]);

  const filterTotal = filteredPeriods.reduce((a, p) => a + p.commission_value, 0);
  const filterSummary = `${filteredPeriods.length} registro${filteredPeriods.length === 1 ? "" : "s"} · ${fmt(filterTotal)}`;
  const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const emptyLabel =
    selectedMonth === "all" ? String(selectedYear) : `${monthNames[selectedMonth]}/${selectedYear}`;

  const handleClosePrevMonth = async () => {
    setClosing(true);
    const { data, error } = await supabase.functions.invoke("close-commission-month", { body: {} });
    setClosing(false);
    if (error) {
      toast.error("Erro ao fechar mês: " + error.message);
      return;
    }
    toast.success(`Mês fechado e marcado como pago: ${(data as { processed?: number } | null)?.processed ?? 0} vendedores`);
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiBox label="Em aberto (mês atual)" value={fmt(totals.open)} accent="text-primary" />
          <KpiBox label="Total pago" value={fmt(totals.paid)} accent="text-green-400" />
          <KpiBox label="Total geral" value={fmt(totals.total)} accent="text-foreground" />
        </div>
      )}

      {/* Vendas pendentes de pagamento (por venda) */}
      <PendingCommissionsCard />

      {/* Ciclo atual */}
      {!loading && <CurrentCycleCard currentMonths={currentMonths} showSeller />}

      {/* Histórico fechado */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-secondary" />
            <h3 className="text-sm font-semibold text-foreground">Histórico de Comissões Pagas</h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClosePrevMonth}
            disabled={closing}
            className="gap-1.5"
          >
            {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Fechar mês anterior agora
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Snapshots mensais por vendedor. Filtre por ano e mês para navegar pelo histórico.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <CommissionHistoryFilters
              availableYears={availableYears}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
              summary={filterSummary}
            />
            <CommissionHistoryTable
              periods={filteredPeriods}
              showSeller
              groupByMonth={selectedMonth === "all"}
              emptyMessage={`Nenhum ciclo fechado em ${emptyLabel}.`}
            />
          </>
        )}
      </div>
    </div>
  );
}

function KpiBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl bg-muted/20 p-3 border border-border/30">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-black ${accent}`}>{value}</p>
    </div>
  );
}
