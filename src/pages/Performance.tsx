import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useDeals } from "@/hooks/useDeals";
import { useActivities } from "@/hooks/useDeals";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  Zap,
  Award,
  Clock,
  PhoneCall,
  Loader2,
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

const variantMap: Record<string, { iconBg: string; iconColor: string }> = {
  purple: { iconBg: "bg-primary/15", iconColor: "text-primary" },
  destructive: { iconBg: "bg-destructive/15", iconColor: "text-destructive" },
  cyan: { iconBg: "bg-secondary/15", iconColor: "text-secondary" },
  success: { iconBg: "bg-success/15", iconColor: "text-success" },
};

const tooltipStyle = {
  backgroundColor: "hsl(0, 0%, 8%)",
  border: "1px solid hsl(0, 0%, 16%)",
  borderRadius: "12px",
  color: "hsl(0, 0%, 100%)",
};


// Conquistas calculadas dinamicamente dentro do componente

const Performance = () => {
  const { user, roles } = useAuth();
  const { deals: allDeals, loading: dealsLoading } = useDeals({ includeClosed: true });
  const { activities: allActivities, loading: activitiesLoading } = useActivities();
  const [role, setRole] = useState<Role>("SDR");

  const loading = dealsLoading || activitiesLoading;

  // Filtrar apenas dados do próprio usuário
  const deals = useMemo(
    () =>
      user
        ? allDeals.filter(
            (d) => d.user_id === user.id || d.closed_by_user_id === user.id,
          )
        : [],
    [allDeals, user],
  );
  const activities = useMemo(
    () => (user ? allActivities.filter((a) => a.user_id === user.id) : []),
    [allActivities, user],
  );



  // Monthly evolution — group deals by month
  const monthlyData = useMemo(() => {
    const months: Record<string, { conversoes: number; perdidas: number; receita: number }> = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    deals.forEach((d) => {
      const date = new Date(d.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!months[key]) months[key] = { conversoes: 0, perdidas: 0, receita: 0 };
      if (d.stage === "fechado_ganho") {
        months[key].conversoes++;
        months[key].receita += Number(d.value);
      } else if (d.stage === "fechado_perdido") {
        months[key].perdidas++;
      }
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, data]) => ({
        name: monthNames[parseInt(key.split("-")[1])],
        ...data,
      }));
  }, [deals]);

  // Weekly activities — janela rolante dos últimos 7 dias
  const weeklyActivities = useMemo(() => {
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return { date: d, name: dayNames[d.getDay()], ligacoes: 0, conversoes: 0 };
    });
    const startMs = buckets[0].date.getTime();

    const bucketIdx = (iso: string | null | undefined) => {
      if (!iso) return -1;
      const dt = new Date(iso);
      dt.setHours(0, 0, 0, 0);
      const diff = Math.floor((dt.getTime() - startMs) / 86400000);
      return diff >= 0 && diff < 7 ? diff : -1;
    };

    activities.forEach((a) => {
      if (a.type !== "call") return;
      const i = bucketIdx(a.created_at);
      if (i >= 0) buckets[i].ligacoes++;
    });

    deals.forEach((d) => {
      if (d.stage !== "fechado_ganho") return;
      const i = bucketIdx(d.closed_at);
      if (i >= 0) buckets[i].conversoes++;
    });

    return buckets.map(({ name, ligacoes, conversoes }) => ({ name, ligacoes, conversoes }));
  }, [activities, deals]);

  // Stats
  const stats = useMemo(() => {
    const totalDeals = deals.length;
    const wonDeals = deals.filter((d) => d.stage === "fechado_ganho").length;
    const conversionRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const callsToday = activities.filter(
      (a) => a.type === "call" && new Date(a.created_at) >= today
    ).length;

    return [
      { label: "Taxa de Conversão", value: `${conversionRate}%`, change: 0, icon: Target, variant: "purple" },
      { label: "Leads Ganhos", value: String(wonDeals), change: 0, icon: Flame, variant: "destructive" },
      { label: "Total de Leads", value: String(totalDeals), change: 0, icon: Clock, variant: "cyan" },
      { label: "Ligações Hoje", value: String(callsToday), change: 0, icon: PhoneCall, variant: "success" },
    ];
  }, [deals, activities]);

  // ── Conquistas dinâmicas ──
  const achievements = useMemo(() => {
    const wonDeals = deals.filter((d) => d.stage === "fechado_ganho");
    const wonCount = wonDeals.length;

    // Primeira venda
    const firstSale = wonCount >= 1;

    // 100 ligações nos últimos 7 dias
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const callsThisWeek = activities.filter(
      (a) => a.type === "call" && new Date(a.created_at) >= weekAgo
    ).length;
    const callsGoal = 100;
    const callsUnlocked = callsThisWeek >= callsGoal;

    // Streak de dias consecutivos com venda
    const saleDates = new Set(
      wonDeals
        .filter((d) => d.closed_at)
        .map((d) => String(d.closed_at).slice(0, 10))
    );
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (saleDates.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    const streakGoal = 15;
    const streakUnlocked = streak >= streakGoal;

    // 10 vendas no mês
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const salesThisMonth = wonDeals.filter((d) =>
      d.closed_at && String(d.closed_at).startsWith(monthKey)
    ).length;
    const monthGoal = 10;
    const monthUnlocked = salesThisMonth >= monthGoal;

    return [
      {
        title: "Primeira venda",
        desc: firstSale ? "Conquistado!" : "Feche sua primeira venda",
        icon: Award,
        unlocked: firstSale,
      },
      {
        title: `${callsGoal} ligações na semana`,
        desc: callsUnlocked ? "Conquistado!" : `${callsThisWeek}/${callsGoal} esta semana`,
        icon: PhoneCall,
        unlocked: callsUnlocked,
      },
      {
        title: `Streak de ${streakGoal} dias`,
        desc: streakUnlocked
          ? "Conquistado!"
          : streak === 0
          ? "Comece vendendo hoje"
          : `${streak}/${streakGoal} dias seguidos`,
        icon: Flame,
        unlocked: streakUnlocked,
      },
      {
        title: `${monthGoal} vendas no mês`,
        desc: monthUnlocked ? "Conquistado!" : `${salesThisMonth}/${monthGoal} este mês`,
        icon: Target,
        unlocked: monthUnlocked,
      },
    ];
  }, [deals, activities]);

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <FloatingHeader role={role} onRoleChange={setRole} />

          <main className="flex-1 px-3 sm:px-4 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <h2 className="text-2xl font-bold text-foreground">Performance</h2>
              <p className="text-sm text-muted-foreground">Análise detalhada do seu desempenho comercial</p>
            </motion.div>

            {/* Stat Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, i) => {
                const v = variantMap[stat.variant];
                const isPositive = stat.change >= 0;
                return (
                  <motion.div key={stat.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                    <div className="glass-card p-5 transition-all duration-300 hover:-translate-y-0.5">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                          {stat.change !== 0 ? (
                            <div className="flex items-center gap-1">
                              {isPositive ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                              <span className={`text-xs font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
                                {isPositive ? "+" : ""}{stat.change}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-muted-foreground">—</span>
                            </div>
                          )}
                        </div>
                        <div className={`rounded-xl p-2.5 ${v.iconBg}`}>
                          <stat.icon className={`h-5 w-5 ${v.iconColor}`} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Charts Row 1 */}
            <div className="mb-6 grid grid-cols-1 gap-4">
              <motion.div custom={4} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <div className="glass-card p-6">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Evolução Mensal</h3>
                  {monthlyData.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">Sem dados ainda. Feche leads para ver a evolução!</p>
                  ) : (
                    <div className="h-48 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData}>
                          <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FFD600" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#FFD600" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="areaCyanGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FF8F00" stopOpacity={0.2} />
                              <stop offset="100%" stopColor="#FF8F00" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,10%)" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(240,4%,66%)", fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(240,4%,66%)", fontSize: 12 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Area type="monotone" dataKey="conversoes" stroke="#FFD600" strokeWidth={2} fill="url(#areaGradient)" name="Conversões" />
                          <Area type="monotone" dataKey="perdidas" stroke="#FF8F00" strokeWidth={2} fill="url(#areaCyanGradient)" name="Perdidas" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <motion.div custom={6} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <div className="glass-card p-6">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Atividades da Semana</h3>
                  <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyActivities} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,10%)" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(240,4%,66%)", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(240,4%,66%)", fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="ligacoes" fill="#FFD600" radius={[6, 6, 0, 0]} name="Ligações" barSize={18} />
                        <Bar dataKey="conversoes" fill="#FF8F00" radius={[6, 6, 0, 0]} name="Conversões" barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Ligações</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-secondary" />Conversões</span>
                  </div>
                </div>
              </motion.div>

              <motion.div custom={7} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <div className="glass-card p-6 h-full">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Conquistas</h3>
                  <div className="space-y-3">
                    {achievements.map((ach) => (
                      <div
                        key={ach.title}
                        className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                          ach.unlocked ? "bg-primary/10 hover:bg-primary/15" : "bg-muted/30 opacity-60"
                        }`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          ach.unlocked ? "gradient-yellow-orange" : "bg-muted"
                        }`}>
                          <ach.icon className={`h-5 w-5 ${ach.unlocked ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${ach.unlocked ? "text-foreground" : "text-muted-foreground"}`}>{ach.title}</p>
                          <p className="text-xs text-muted-foreground">{ach.desc}</p>
                        </div>
                        {ach.unlocked && (
                          <Zap className="h-4 w-4 text-secondary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Performance;
