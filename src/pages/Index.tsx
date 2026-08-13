import { useState, useEffect, useMemo, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useDeals } from "@/hooks/useDeals";
import { useCommissionRates } from "@/hooks/useCommissionRates";
import { useCurrentMonth } from "@/hooks/useCurrentMonth";
import { useCurrentWeek } from "@/hooks/useCurrentWeek";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { GoalDonutChart } from "@/components/dashboard/GoalDonutChart";
import { GoalProgressBar } from "@/components/dashboard/GoalProgressBar";
import { PerformanceBarChart } from "@/components/dashboard/PerformanceBarChart";
import { SellerRanking } from "@/components/dashboard/SellerRanking";
import { CommissionCard } from "@/components/dashboard/CommissionCard";
import { MrrSection } from "@/components/dashboard/MrrSection";

import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

type Role = "SDR" | "Closer";

const easeOut: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: easeOut },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.05, duration: 0.4, ease: easeOut },
  }),
};

const kpiCards = [
  { title: "Conversões", key: "conversoes" as const, icon: CheckCircle2, variant: "success" as const },
  { title: "Leads Perdidos", key: "perdidas" as const, icon: XCircle, variant: "destructive" as const },
  { title: "Leads Pendentes", key: "pendentes" as const, icon: Clock, variant: "cyan" as const },
  { title: "Em Recuperação", key: "recuperacao" as const, icon: RefreshCw, variant: "purple" as const },
];

function DashboardSkeleton() {
  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.key} className="glass-card p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <Skeleton className="h-3 w-24 bg-muted/60" />
                <Skeleton className="h-8 w-16 bg-muted/70" />
                <Skeleton className="h-3 w-12 bg-muted/50" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl bg-primary/15" />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card flex min-h-[300px] flex-col items-center justify-center gap-6 p-6">
          <Skeleton className="h-5 w-32 bg-muted/60" />
          <Skeleton className="h-44 w-44 rounded-full bg-muted/70" />
          <Skeleton className="h-4 w-48 bg-muted/50" />
        </div>
        <div className="space-y-4">
          <div className="glass-card p-6">
            <Skeleton className="mb-4 h-4 w-36 bg-muted/60" />
            <Skeleton className="h-3 w-full rounded-full bg-muted/70" />
            <div className="mt-4 flex justify-between">
              <Skeleton className="h-3 w-16 bg-muted/50" />
              <Skeleton className="h-3 w-20 bg-muted/50" />
            </div>
          </div>
          <div className="glass-card p-6">
            <Skeleton className="mb-4 h-4 w-28 bg-muted/60" />
            <Skeleton className="h-9 w-40 bg-muted/70" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card p-6">
          <Skeleton className="mb-6 h-4 w-40 bg-muted/60" />
          <div className="flex h-56 items-end gap-3">
            {[48, 72, 56, 88, 64, 78].map((height, index) => (
              <Skeleton key={index} className="flex-1 rounded-t-xl bg-muted/70" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="glass-card p-6">
          <Skeleton className="mb-6 h-4 w-32 bg-muted/60" />
          <div className="space-y-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl bg-primary/15" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32 bg-muted/70" />
                  <Skeleton className="h-2 w-full rounded-full bg-muted/50" />
                </div>
                <Skeleton className="h-4 w-16 bg-muted/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

interface GoalData {
  target_value: number;
  current_value: number;
}

const Index = () => {
  const { user, roles } = useAuth();
  const { deals, loading: dealsLoading } = useDeals({ includeClosed: true });
  const { getRate, loading: ratesLoading } = useCommissionRates();
  const { monthStart, monthEnd, monthKey } = useCurrentMonth();
  const { weekStart, weekEnd, weekKey } = useCurrentWeek();
  const [role, setRole] = useState<Role>("SDR");
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;
    supabase
      .from("goals")
      .select("target_value, current_value")
      .or(`target_user_id.eq.${user.id},target_user_id.is.null`)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setGoal(data[0] as GoalData);
      });
  }, [user, monthKey]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name")
      .then(({ data }) => {
        const map = new Map<string, string>();
        data?.forEach((p) => map.set(p.id, p.full_name));
        setProfileMap(map);
      });
  }, []);

  // Helpers de filtro mensal — usados pelos KPIs e receita "do mês corrente".
  // Atualizam automaticamente quando o mês vira (via useCurrentMonth).
  const inCurrentMonth = useCallback(
    (iso: string | null | undefined) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d >= monthStart && d < monthEnd;
    },
    [monthStart, monthEnd],
  );

  const kpiData = useMemo(() => {
    const conversoes = deals.filter(
      (d) => d.stage === "fechado_ganho" && inCurrentMonth(d.closed_at)
    ).length;
    const perdidas = deals.filter(
      (d) => d.stage === "fechado_perdido" && inCurrentMonth(d.closed_at)
    ).length;
    // Pendentes é snapshot do pipeline aberto agora — não filtra por mês.
    const pendentes = deals.filter((d) =>
      ["lead", "contato_iniciado", "reuniao_marcada", "proposta_enviada", "negociacao"].includes(d.stage)
    ).length;
    const recuperacao = deals.filter(
      (d) => d.stage === "fechado_ganho" && d.recovered_at && inCurrentMonth(d.recovered_at)
    ).length;
    return {
      conversoes: { value: conversoes, change: 0 },
      perdidas: { value: perdidas, change: 0 },
      pendentes: { value: pendentes, change: 0 },
      recuperacao: { value: recuperacao, change: 0 },
    };
  }, [deals, inCurrentMonth]);

  const totalReceita = useMemo(() =>
    deals
      .filter((d) => d.stage === "fechado_ganho" && inCurrentMonth(d.closed_at))
      .reduce((s, d) => s + Number(d.value), 0),
    [deals, inCurrentMonth]
  );

  const metaTarget = goal?.target_value ?? 0;
  const metaCurrent = totalReceita || (goal?.current_value ?? 0);
  const metaPct = metaTarget > 0 ? Math.min(100, Math.round((metaCurrent / metaTarget) * 100)) : 0;

  // Comissão pessoal: receita do mês gerada pelo usuário logado * sua taxa configurada
  const myReceita = useMemo(() =>
    deals
      .filter(
        (d) =>
          d.stage === "fechado_ganho" &&
          (d.closed_by_user_id ?? d.user_id) === user?.id &&
          inCurrentMonth(d.closed_at)
      )
      .reduce((s, d) => s + Number(d.value), 0),
    [deals, user?.id, inCurrentMonth]
  );
  const myRate = user ? getRate(user.id, roles) : 10;
  const comissao = Math.round(myReceita * myRate) / 100;

  const weeklyData = useMemo(() => {
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    // Janela móvel dos últimos 7 dias (termina hoje).
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return { date: d, name: dayNames[d.getDay()], value: 0 };
    });
    const startMs = buckets[0].date.getTime();
    deals.forEach((d) => {
      if (d.stage !== "fechado_ganho" || !d.closed_at) return;
      const dt = new Date(d.closed_at);
      dt.setHours(0, 0, 0, 0);
      const diff = Math.floor((dt.getTime() - startMs) / 86400000);
      if (diff >= 0 && diff < 7) buckets[diff].value++;
    });
    return buckets.map(({ name, value }) => ({ name, value }));
  }, [deals, weekKey]);

  const sellers = useMemo(() => {
    const won = deals.filter(
      (d) => d.stage === "fechado_ganho" && inCurrentMonth(d.closed_at)
    );
    const totals = new Map<string, number>();
    won.forEach((d) => {
      const sellerId = d.closed_by_user_id ?? d.user_id;
      if (!sellerId) return;
      totals.set(sellerId, (totals.get(sellerId) ?? 0) + Number(d.value));
    });
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, value], i) => ({
        name: profileMap.get(id) ?? "Sem nome",
        value,
        position: i + 1,
      }));
  }, [deals, profileMap, inCurrentMonth]);


  const dashboardLoading = dealsLoading || ratesLoading;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <FloatingHeader role={role} onRoleChange={setRole} />

          <main className="flex-1 px-3 sm:px-4 pb-8">
            {dashboardLoading ? (
              <DashboardSkeleton />
            ) : (
              <>
            {/* KPI Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kpiCards.map((card, i) => (
                <motion.div
                  key={card.key}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  <KPICard
                    title={card.title}
                    value={kpiData[card.key].value}
                    change={kpiData[card.key].change}
                    icon={card.icon}
                    variant={card.variant}
                  />
                </motion.div>
              ))}
            </div>

            <MrrSection />



            {/* Meta + Commission row */}
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <motion.div custom={4} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}>
                <GoalDonutChart
                  percentage={metaPct}
                  goal={metaTarget}
                  current={metaCurrent}
                />
              </motion.div>
              <motion.div custom={5} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="space-y-4">
                <GoalProgressBar percentage={metaPct} />
                <CommissionCard value={comissao} />
              </motion.div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <motion.div custom={6} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}>
                <PerformanceBarChart data={weeklyData} />
              </motion.div>
              <motion.div custom={7} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}>
                <SellerRanking sellers={sellers} />
              </motion.div>
            </div>

              </>

            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
