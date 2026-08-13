import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Monitor, Radio, Target, Trophy, UserMinus, UserPlus, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { useCurrentMonth } from "@/hooks/useCurrentMonth";
import nextLogo from "@/assets/next-logo.jpg";

interface Goal {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface Deal {
  id: string;
  user_id: string;
  closed_by_user_id: string | null;
  value: number;
  stage: string;
  closed_at: string | null;
  created_at?: string;
}

interface RecentSale {
  id: string;
  value: number;
  closed_at: string;
  contact_name: string | null;
  company_name: string | null;
  closed_by_user_id: string | null;
  user_id: string;
}

interface SellerRow {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  roles: string[];
  revenue: number;
  previousRevenue: number;
  deals: number;
  goalContribution: number;
  revenueShare: number;
  monthVariation: number;
  personalTarget: number | null;
  personalGoalProgress: number;
}

interface IndividualGoal {
  target_user_id: string;
  target_value: number;
}

interface ClientLite {
  id: string;
  name: string | null;
  company: string | null;
  status: string;
  monthly_revenue: number | null;
  created_at: string;
  churned_at: string | null;
  churn_reason: string | null;
}


const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

const formatCurrency = (value: number) =>
  (value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "--";

const formatRelativeTime = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return "agora";
  if (sec < 60) return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr} h`;
  const d = Math.floor(hr / 24);
  return `há ${d} d`;
};

const buildBoundsFrom = (now: Date) => {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return {
    now,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    previousStartIso: previousStart.toISOString(),
    previousEndIso: previousEnd.toISOString(),
    previousMonthLabel: monthFormatter.format(previousStart),
  };
};

// (Componentes circulares MonthlyGoalDonut e FloatingMetricCard removidos —
// foco do painel agora é o ranking de vendedores)


export default function TV() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [monthlyDeals, setMonthlyDeals] = useState<Deal[]>([]);
  const [previousDeals, setPreviousDeals] = useState<Deal[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [individualGoals, setIndividualGoals] = useState<IndividualGoal[]>([]);
  const [newClients, setNewClients] = useState<ClientLite[]>([]);
  const [churnedClients, setChurnedClients] = useState<ClientLite[]>([]);
  const [showClientMovement, setShowClientMovement] = useState(false);
  const [highlightedSaleIds, setHighlightedSaleIds] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { monthKey } = useCurrentMonth();
  const bounds = useMemo(() => {
    const [year, month] = monthKey.split("-").map(Number);
    return buildBoundsFrom(new Date(year, month - 1, 15));
  }, [monthKey]);


  const fetchTvData = useCallback(async () => {
    const [goalsRes, individualGoalsRes, profilesRes, rolesRes, dealsRes, monthlyDealsRes, previousDealsRes, recentRes, newClientsRes, churnedClientsRes] = await Promise.all([
      supabase
        .from("goals")
        .select("id, title, target_value, current_value, start_date, end_date")
        .is("target_user_id", null)
        .eq("period", "monthly")
        .lte("start_date", bounds.endDate)
        .gte("end_date", bounds.startDate)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("goals")
        .select("target_user_id, target_value")
        .not("target_user_id", "is", null)
        .eq("period", "monthly")
        .lte("start_date", bounds.endDate)
        .gte("end_date", bounds.startDate),
      supabase.from("profiles").select("id, full_name, avatar_url").eq("status", "approved").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase
        .from("deals")
        .select("id, user_id, closed_by_user_id, value, stage, closed_at")
        .eq("stage", "fechado_ganho")
        .gte("closed_at", bounds.startIso)
        .lte("closed_at", bounds.endIso),
      supabase
        .from("deals")
        .select("id, user_id, closed_by_user_id, value, stage, closed_at, created_at")
        .gte("created_at", bounds.startIso)
        .lte("created_at", bounds.endIso),
      supabase
        .from("deals")
        .select("id, user_id, closed_by_user_id, value, stage, closed_at")
        .eq("stage", "fechado_ganho")
        .gte("closed_at", bounds.previousStartIso)
        .lte("closed_at", bounds.previousEndIso),
      supabase
        .from("deals")
        .select("id, value, closed_at, contact_name, company_name, closed_by_user_id, user_id")
        .eq("stage", "fechado_ganho")
        .not("closed_at", "is", null)
        .order("closed_at", { ascending: false })
        .limit(15),
      supabase
        .from("clients")
        .select("id, name, company, status, monthly_revenue, created_at, churned_at, churn_reason")
        .gte("created_at", bounds.startIso)
        .lte("created_at", bounds.endIso)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("clients")
        .select("id, name, company, status, monthly_revenue, created_at, churned_at, churn_reason")
        .neq("status", "ativo")
        .not("churned_at", "is", null)
        .gte("churned_at", bounds.startDate)
        .lte("churned_at", bounds.endDate)
        .order("churned_at", { ascending: false })
        .limit(20),
    ]);

    setGoal((goalsRes.data?.[0] as Goal | undefined) ?? null);
    setIndividualGoals(((individualGoalsRes.data ?? []) as IndividualGoal[]).filter((g) => g.target_user_id));
    setProfiles((profilesRes.data as Profile[]) ?? []);
    setRoles((rolesRes.data as UserRole[]) ?? []);
    setDeals((dealsRes.data as Deal[]) ?? []);
    setMonthlyDeals((monthlyDealsRes.data as Deal[]) ?? []);
    setPreviousDeals((previousDealsRes.data as Deal[]) ?? []);
    setNewClients((newClientsRes.data as ClientLite[]) ?? []);
    setChurnedClients((churnedClientsRes.data as ClientLite[]) ?? []);

    const newRecent = (recentRes.data as RecentSale[]) ?? [];
    setRecentSales((prev) => {
      const prevIds = new Set(prev.map((s) => s.id));
      const justArrived = newRecent.filter((s) => !prevIds.has(s.id)).map((s) => s.id);
      if (justArrived.length > 0 && prev.length > 0) {
        setHighlightedSaleIds((curr) => {
          const next = new Set(curr);
          justArrived.forEach((id) => next.add(id));
          return next;
        });
        justArrived.forEach((id) => {
          window.setTimeout(() => {
            setHighlightedSaleIds((curr) => {
              const next = new Set(curr);
              next.delete(id);
              return next;
            });
          }, 6000);
        });
      }
      return newRecent;
    });

    setLastUpdate(new Date());
    setLoading(false);
  }, [bounds.endDate, bounds.endIso, bounds.previousEndIso, bounds.previousStartIso, bounds.startDate, bounds.startIso]);

  useEffect(() => {
    fetchTvData();

    const channel = supabase
      .channel(`tv-dashboard-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, fetchTvData)
      .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, fetchTvData)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchTvData)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, fetchTvData)
      .subscribe();

    const interval = window.setInterval(fetchTvData, 60000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchTvData]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const sellers = useMemo<SellerRow[]>(() => {
    const roleMap = new Map<string, string[]>();
    roles.forEach((item) => {
      const list = roleMap.get(item.user_id) ?? [];
      list.push(item.role);
      roleMap.set(item.user_id, list);
    });

    const sellerMap = new Map<string, SellerRow>();
    profiles.forEach((profile) => {
      const userRoles = roleMap.get(profile.id) ?? [];
      if (userRoles.length > 0 && !userRoles.some((role) => role === "sdr" || role === "closer" || role === "admin")) return;
      sellerMap.set(profile.id, {
        id: profile.id,
        name: profile.full_name || "Vendedor",
        initials: getInitials(profile.full_name),
        avatarUrl: profile.avatar_url ?? null,
        roles: userRoles,
        revenue: 0,
        previousRevenue: 0,
        deals: 0,
        goalContribution: 0,
        revenueShare: 0,
        monthVariation: 0,
        personalTarget: null,
        personalGoalProgress: 0,
      });
    });

    previousDeals.forEach((deal) => {
      const sellerId = deal.closed_by_user_id ?? deal.user_id;
      if (!sellerId) return;
      const existing = sellerMap.get(sellerId) ?? {
        id: sellerId,
        name: "Vendedor",
        initials: "VD",
        avatarUrl: null,
        roles: [],
        revenue: 0,
        previousRevenue: 0,
        deals: 0,
        goalContribution: 0,
        revenueShare: 0,
        monthVariation: 0,
        personalTarget: null,
        personalGoalProgress: 0,
      };
      existing.previousRevenue += Number(deal.value);
      sellerMap.set(sellerId, existing);
    });

    deals.forEach((deal) => {
      const sellerId = deal.closed_by_user_id ?? deal.user_id;
      if (!sellerId) return;
      const existing = sellerMap.get(sellerId) ?? {
        id: sellerId,
        name: "Vendedor",
        initials: "VD",
        avatarUrl: null,
        roles: [],
        revenue: 0,
        previousRevenue: 0,
        deals: 0,
        goalContribution: 0,
        revenueShare: 0,
        monthVariation: 0,
        personalTarget: null,
        personalGoalProgress: 0,
      };
      existing.revenue += Number(deal.value);
      existing.deals += 1;
      sellerMap.set(sellerId, existing);
    });

    const totalRevenue = deals.reduce((sum, deal) => sum + Number(deal.value), 0);
    const target = Number(goal?.target_value ?? 0);

    const personalTargetMap = new Map<string, number>();
    individualGoals.forEach((g) => {
      if (!g.target_user_id) return;
      const prev = personalTargetMap.get(g.target_user_id) ?? 0;
      // Se houver mais de uma meta para o mesmo vendedor no mês, soma (caso raro).
      personalTargetMap.set(g.target_user_id, prev + Number(g.target_value));
    });

    return Array.from(sellerMap.values())
      .map((seller) => {
        const personalTarget = personalTargetMap.get(seller.id) ?? null;
        return {
          ...seller,
          goalContribution: target > 0 ? Math.min(999, (seller.revenue / target) * 100) : 0,
          revenueShare: totalRevenue > 0 ? (seller.revenue / totalRevenue) * 100 : 0,
          monthVariation: seller.previousRevenue > 0 ? ((seller.revenue - seller.previousRevenue) / seller.previousRevenue) * 100 : seller.revenue > 0 ? 100 : 0,
          personalTarget,
          personalGoalProgress: personalTarget && personalTarget > 0 ? (seller.revenue / personalTarget) * 100 : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [deals, goal?.target_value, previousDeals, profiles, roles, individualGoals]);

  const totalRevenue = useMemo(() => deals.reduce((sum, deal) => sum + Number(deal.value), 0), [deals]);
  const previousRevenue = useMemo(() => previousDeals.reduce((sum, deal) => sum + Number(deal.value), 0), [previousDeals]);
  const conversionRate = monthlyDeals.length > 0 ? Math.round((deals.length / monthlyDeals.length) * 100) : 0;
  const targetValue = Number(goal?.target_value ?? 0);
  const progress = targetValue > 0 ? Math.min(100, Math.round((totalRevenue / targetValue) * 100)) : 0;
  const remaining = Math.max(0, targetValue - totalRevenue);
  const monthLabel = monthFormatter.format(bounds.now);

  const now = bounds.now;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth);

  const avgTicket = deals.length > 0 ? totalRevenue / deals.length : 0;

  const dailyPace = totalRevenue / Math.max(1, dayOfMonth);
  const dailyNeeded = remaining / daysRemaining;
  const pacePercent = dailyNeeded > 0 ? Math.min(100, Math.round((dailyPace / dailyNeeded) * 100)) : dailyPace > 0 ? 100 : 0;

  const activeSellers = sellers.filter((s) => s.revenue > 0).length;
  const activePercent = sellers.length > 0 ? Math.round((activeSellers / sellers.length) * 100) : 0;

  const projection = dailyPace * daysInMonth;
  const projectionPercent = targetValue > 0 ? Math.min(100, Math.round((projection / targetValue) * 100)) : 0;

  const compactCurrency = (v: number) => formatCurrency(v);

  const profileNameById = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => m.set(p.id, p.full_name || "Vendedor"));
    return m;
  }, [profiles]);

  const profileAvatarById = useMemo(() => {
    const m = new Map<string, string | null>();
    profiles.forEach((p) => m.set(p.id, p.avatar_url ?? null));
    return m;
  }, [profiles]);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const salesToday = recentSales.filter((s) => new Date(s.closed_at).getTime() >= todayStart).length;
  // touch tick so relative times re-render
  void tick;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <AppSidebar />
        <div className="min-w-0 flex-1 px-4 py-3 xl:px-6">
          <header className="mb-3 flex items-center justify-between rounded-2xl border border-border/40 bg-card/70 px-5 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-10 w-10 rounded-xl border border-border/50 bg-muted/25 text-primary hover:bg-primary/10 hover:text-primary" />
              <img
                src={nextLogo}
                alt="Next Marketing"
                className="h-12 w-12 rounded-2xl object-cover shadow-xl ring-1 ring-primary/40 glow-yellow"
              />
              <div>
                <h1 className="text-2xl font-black leading-none text-foreground xl:text-3xl">TV de Metas</h1>
                <p className="mt-1 text-xs capitalize text-muted-foreground xl:text-sm">{monthLabel} · painel ao vivo</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowClientMovement((prev) => !prev)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 transition-colors ${
                  showClientMovement
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground"
                }`}
              >
                {showClientMovement ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="text-[10px] font-bold uppercase tracking-wider">Entradas/Saídas</span>
              </button>
              <div className="flex items-center gap-2 rounded-full border border-border/40 bg-muted/20 px-4 py-2">
                <Activity className="h-4 w-4 text-success" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Atualizado</span>
                <span className="text-sm font-black text-foreground">{lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </header>

          <main className="grid h-[calc(100vh-5.5rem)] grid-rows-[auto_1fr_auto] gap-3">
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/75 p-4 backdrop-blur-xl xl:p-5"
            >
              <div className="absolute inset-x-0 top-0 h-px gradient-yellow-orange" />
              <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto]">

                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Meta mensal geral</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                    <p className="text-4xl font-black leading-none text-foreground xl:text-5xl">{formatCurrency(totalRevenue)}</p>
                    <p className="pb-1 text-lg font-black text-secondary xl:text-xl">de {formatCurrency(targetValue)}</p>
                  </div>
                  <p className="mt-2 max-w-2xl truncate text-xs text-muted-foreground xl:text-sm">{goal?.title ?? "Nenhuma meta mensal geral cadastrada"}</p>

                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Barra de metas</span>
                      <span>{formatCurrency(totalRevenue)} / {formatCurrency(targetValue)}</span>
                    </div>
                    <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-muted/70">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full gradient-yellow-orange shadow-[0_0_22px_-8px_hsl(var(--primary))]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid min-w-[16rem] grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-border/35 bg-muted/15 px-3 py-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Falta</p>
                    <p className="mt-1 text-lg font-black text-primary">{formatCurrency(remaining)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/35 bg-muted/15 px-3 py-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vendas</p>
                    <p className="mt-1 text-lg font-black text-foreground">{deals.length}</p>
                  </div>
                </div>
              </div>
            </motion.section>


            <section className="grid min-h-0 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
              <div className="min-h-0 rounded-2xl border border-primary/30 bg-card/70 p-5 backdrop-blur-xl shadow-[0_0_40px_-20px_hsl(var(--primary))]">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-yellow-orange text-primary-foreground shadow-lg">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black leading-none text-foreground xl:text-3xl">Ranking de Vendedores</h2>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{monthLabel}</p>
                    </div>
                  </div>
                  <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                    {sellers.length} vendedor{sellers.length === 1 ? "" : "es"}
                  </div>
                </div>

                {sellers.length === 0 ? (
                  <div className="flex h-[calc(100%-4.5rem)] items-center justify-center rounded-2xl border border-border/40 bg-muted/15 px-3 text-center text-base text-muted-foreground">
                    Nenhum vendedor ou faturamento encontrado para este mês.
                  </div>
                ) : (
                  <div className="grid h-[calc(100%-4.5rem)] min-h-0 grid-cols-1 gap-2 overflow-y-auto pr-1">
                    {sellers.slice(0, 15).map((seller, index) => {
                      const up = seller.monthVariation >= 0;
                      return (
                        <motion.div
                          key={seller.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl border px-4 py-3 ${
                            index === 0
                              ? "border-primary/40 bg-primary/10 shadow-[0_0_24px_-12px_hsl(var(--primary))]"
                              : index === 1
                              ? "border-secondary/30 bg-secondary/8"
                              : index === 2
                              ? "border-accent/30 bg-accent/8"
                              : "border-border/30 bg-muted/10"
                          }`}
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-black ${index === 0 ? "gradient-yellow-orange text-primary-foreground" : index === 1 ? "bg-secondary/20 text-secondary" : index === 2 ? "bg-accent/20 text-accent" : "bg-muted/40 text-muted-foreground"}`}>
                            {index + 1}
                          </div>

                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-sm font-black text-primary">
                              {seller.avatarUrl ? (
                                <img src={seller.avatarUrl} alt={seller.name} className="h-full w-full object-cover" />
                              ) : (
                                seller.initials
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-lg font-bold text-foreground leading-tight xl:text-xl">{seller.name}</p>
                              <p className="text-xs text-muted-foreground leading-tight mt-0.5">{seller.deals} venda{seller.deals === 1 ? "" : "s"}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
                                  {seller.personalTarget && seller.personalTarget > 0 && (
                                    <div
                                      className="h-full rounded-full gradient-yellow-orange transition-all duration-700"
                                      style={{ width: `${Math.min(100, seller.personalGoalProgress)}%` }}
                                    />
                                  )}
                                </div>
                                {seller.personalTarget && seller.personalTarget > 0 ? (
                                  <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${seller.personalGoalProgress >= 100 ? "text-primary" : "text-muted-foreground"}`}>
                                    {seller.personalGoalProgress.toFixed(0)}% da meta
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-muted-foreground/70">
                                    Sem meta
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <p className="text-2xl font-black leading-none text-secondary">{compactCurrency(seller.revenue)}</p>
                            <div className={`inline-flex items-center gap-1 text-sm font-bold leading-none ${up ? "text-success" : "text-destructive"}`}>
                              {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                              {Math.abs(seller.monthVariation).toFixed(0)}%
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {sellers.length > 15 && (
                      <div className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        +{sellers.length - 15} vendedores
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="min-h-0 rounded-2xl border border-success/25 bg-card/65 p-3 backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-6 w-6 items-center justify-center rounded-md bg-success/15 text-success">
                      <Radio className="h-3 w-3" />
                      <span className="absolute -right-0.5 -top-0.5 flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                      </span>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold leading-none text-foreground">Vendas ao vivo</h2>
                      <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-success">tempo real</p>
                    </div>
                  </div>
                  <div className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-black text-success">
                    {salesToday} hoje
                  </div>
                </div>

                {recentSales.length === 0 ? (
                  <div className="flex h-[calc(100%-2.25rem)] items-center justify-center rounded-2xl border border-border/40 bg-muted/15 px-3 text-center text-xs text-muted-foreground">
                    Aguardando a primeira venda…
                  </div>
                ) : (
                  <div className="grid h-[calc(100%-2.25rem)] min-h-0 grid-cols-1 gap-1 overflow-y-auto pr-1">
                    {recentSales.slice(0, 10).map((sale) => {
                      const sellerId = sale.closed_by_user_id ?? sale.user_id;
                      const sellerName = profileNameById.get(sellerId) ?? "Vendedor";
                      const sellerAvatar = profileAvatarById.get(sellerId) ?? null;
                      const initials = getInitials(sellerName);
                      const isHot = highlightedSaleIds.has(sale.id);
                      const clientLabel = sale.contact_name || sale.company_name || "Cliente";
                      return (
                        <motion.div
                          key={sale.id}
                          layout
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.35 }}
                          className={`grid grid-cols-[1.5rem_1fr_auto] items-center gap-1.5 rounded-md border px-1.5 py-1 transition-colors ${
                            isHot
                              ? "border-primary/60 bg-primary/15 shadow-[0_0_22px_-6px_hsl(var(--primary))]"
                              : "border-border/30 bg-muted/10"
                          }`}
                        >
                          <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded bg-success/15 text-[9px] font-black text-success">
                            {sellerAvatar ? (
                              <img src={sellerAvatar} alt={sellerName} className="h-full w-full object-cover" />
                            ) : (
                              initials
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-foreground leading-tight">{sellerName}</p>
                            <p className="truncate text-[9px] text-muted-foreground leading-tight">{clientLabel}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <p className="text-xs font-black leading-none text-primary">{compactCurrency(Number(sale.value))}</p>
                            <div className="inline-flex items-center gap-0.5 text-[9px] font-bold leading-none text-muted-foreground">
                              {isHot && <Zap className="h-2.5 w-2.5 text-primary" />}
                              {formatRelativeTime(sale.closed_at)}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {showClientMovement && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="rounded-2xl border border-success/30 bg-card/70 p-4 backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Entraram</h3>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">novos clientes no mês</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black leading-none text-success">{newClients.length}</p>
                    </div>
                  </div>
                  {newClients.length === 0 ? (
                    <p className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2 text-center text-[11px] text-muted-foreground">
                      Nenhum cliente novo este mês
                    </p>
                  ) : (
                    <div className="grid gap-1">
                      {newClients.slice(0, 5).map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-success/20 bg-success/5 px-2 py-1">
                          <p className="truncate text-xs font-bold text-foreground">{c.company || c.name}</p>
                          <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{formatRelativeTime(c.created_at)}</p>
                        </div>
                      ))}
                      {newClients.length > 5 && (
                        <p className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">+{newClients.length - 5}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-destructive/30 bg-card/70 p-4 backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
                        <UserMinus className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Saíram</h3>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          churn no mês{churnedClients.length > 0 && ` · ${formatCurrency(churnedClients.reduce((s, c) => s + Number(c.monthly_revenue ?? 0), 0))} MRR`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black leading-none text-destructive">{churnedClients.length}</p>
                    </div>
                  </div>
                  {churnedClients.length === 0 ? (
                    <p className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2 text-center text-[11px] text-muted-foreground">
                      Nenhum cliente saiu este mês
                    </p>
                  ) : (
                    <div className="grid gap-1">
                      {churnedClients.slice(0, 5).map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1">
                          <p className="truncate text-xs font-bold text-foreground">{c.company || c.name}</p>
                          <p className="shrink-0 truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.churn_reason || c.status}</p>
                        </div>
                      ))}
                      {churnedClients.length > 5 && (
                        <p className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">+{churnedClients.length - 5}</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.section>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
