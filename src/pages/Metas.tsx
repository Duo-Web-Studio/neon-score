import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  Target,
  TrendingUp,
  Calendar,
  Award,
  Flame,
  CheckCircle2,
  Building2,
  Users,
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

interface DbGoal {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  period: string;
  start_date: string;
  end_date: string;
  target_user_id: string | null;
  status?: string;
  archived_at?: string | null;
}

function GoalCard({ goal, index }: { goal: DbGoal; index: number }) {
  const pct = goal.target_value > 0
    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
    : 0;

  const isArchived = goal.status && goal.status !== "active";
  const achieved = goal.status === "achieved";

  const monthLabel = (() => {
    try {
      const d = new Date(goal.start_date + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
    } catch {
      return "";
    }
  })();

  return (
    <motion.div custom={index} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
      <div className="glass-card p-5 transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{goal.title}</p>
          {goal.target_user_id ? (
            <Users className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-secondary" />
          )}
        </div>

        {isArchived && (
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground capitalize">{monthLabel}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                achieved
                  ? "bg-success/20 text-success"
                  : "bg-destructive/20 text-destructive"
              }`}
            >
              {achieved ? "Batida" : "Não batida"}
            </span>
          </div>
        )}

        <div className="flex items-end justify-between mb-3">
          <p className="text-2xl font-bold text-foreground">
            {goal.current_value.toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-muted-foreground">
            de {goal.target_value.toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6, ease: easeOut }}
            className={`h-full rounded-full ${
              isArchived && !achieved
                ? "bg-destructive/60"
                : pct >= 100
                ? "bg-success"
                : "gradient-yellow-orange"
            }`}
          />
        </div>
        <p className="mt-1.5 text-right text-xs font-bold text-muted-foreground">{pct}%</p>
      </div>
    </motion.div>
  );
}

const Metas = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<Role>("SDR");
  const [goals, setGoals] = useState<DbGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("id, title, target_value, current_value, period, start_date, end_date, target_user_id, status, archived_at")
      .order("start_date", { ascending: false });
    setGoals((data as DbGoal[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchGoals();

    const channel = supabase
      .channel(`metas-realtime-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, fetchGoals)
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, fetchGoals)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchGoals]);

  const isActive = (g: DbGoal) => !g.status || g.status === "active";

  const myGoals = goals.filter((g) => g.target_user_id === user?.id && isActive(g));
  const companyGoals = goals.filter((g) => g.target_user_id === null && isActive(g));
  const allUserGoals = useMemo(() => [...myGoals, ...companyGoals], [myGoals, companyGoals]);


  const archivedMyGoals = goals.filter((g) => g.target_user_id === user?.id && !isActive(g));
  const archivedCompanyGoals = goals.filter((g) => g.target_user_id === null && !isActive(g));

  const overallPct = useMemo(() => {
    if (allUserGoals.length === 0) return 0;
    const avg = allUserGoals.reduce((s, g) => {
      return s + (g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0);
    }, 0) / allUserGoals.length;
    return Math.min(100, Math.round(avg));
  }, [allUserGoals]);


  const donutData = [
    { name: "Atingido", value: overallPct },
    { name: "Restante", value: Math.max(0, 100 - overallPct) },
  ];

  const milestones = [
    { label: "25% da meta", pct: 25, reached: overallPct >= 25 },
    { label: "50% da meta", pct: 50, reached: overallPct >= 50 },
    { label: "75% da meta", pct: 75, reached: overallPct >= 75 },
    { label: "Meta batida!", pct: 100, reached: overallPct >= 100 },
  ];

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  const daysLeft = daysInMonth - today;
  const projection = today > 0 ? Math.min(100, Math.round((overallPct / today) * daysInMonth)) : 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <FloatingHeader role={role} onRoleChange={setRole} />

          <main className="flex-1 px-3 sm:px-4 pb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Metas</h2>
              <p className="text-sm text-muted-foreground">Acompanhe suas metas individuais e da empresa</p>
            </motion.div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allUserGoals.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Target className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-foreground font-semibold mb-1">Nenhuma meta atribuída</p>
                <p className="text-sm text-muted-foreground">Aguarde o administrador definir suas metas.</p>
              </div>
            ) : (
              <>
                {/* Top row: Donut + Milestones + Summary */}
                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <motion.div custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                    <div className="glass-card p-6 h-full flex flex-col items-center justify-center">
                      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Meta Geral</h3>
                      <div className="relative h-36 w-36 sm:h-44 sm:w-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={72} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
                              <Cell fill="url(#metaDonut)" />
                              <Cell fill="hsl(0,0%,10%)" />
                            </Pie>
                            <defs>
                              <linearGradient id="metaDonut" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#FFD600" />
                                <stop offset="100%" stopColor="#FF8F00" />
                              </linearGradient>
                            </defs>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-foreground">{overallPct}%</span>
                          <span className="text-[10px] text-muted-foreground">atingido</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{daysLeft} dias restantes no mês</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                    <div className="glass-card p-6 h-full">
                      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Marcos</h3>
                      <div className="space-y-4">
                        {milestones.map((m) => (
                          <div key={m.pct} className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${m.reached ? "gradient-yellow-orange" : "bg-muted"}`}>
                              {m.reached ? <CheckCircle2 className="h-4 w-4 text-primary-foreground" /> : <Target className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${m.reached ? "text-foreground" : "text-muted-foreground"}`}>{m.label}</p>
                            </div>
                            <span className={`text-xs font-bold ${m.reached ? "text-secondary" : "text-muted-foreground"}`}>{m.pct}%</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${overallPct}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3, duration: 0.8, ease: easeOut }}
                          className="h-full rounded-full gradient-orange-strong"
                        />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div custom={2} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                    <div className="glass-card p-6 h-full space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resumo</h3>

                      <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                          <Flame className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Ritmo Atual</p>
                          <p className="text-xs text-muted-foreground">
                            {overallPct >= 75 ? "Excelente — no caminho certo!" : overallPct >= 50 ? "Bom — acelere para bater!" : "Atenção — ritmo abaixo do esperado"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl bg-secondary/10 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20">
                          <TrendingUp className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Projeção</p>
                          <p className="text-xs text-muted-foreground">
                            ~{projection}% até o fim do mês
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl bg-success/10 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/20">
                          <Award className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Total de Metas</p>
                          <p className="text-xs text-muted-foreground">
                            {myGoals.length} individual{myGoals.length !== 1 ? "is" : ""} · {companyGoals.length} da empresa
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Individual Goals */}
                {myGoals.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="mb-6">
                    <h3 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Minhas Metas
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {myGoals.map((goal, i) => (
                        <GoalCard key={goal.id} goal={goal} index={i + 3} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Company Goals */}
                {companyGoals.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="mb-6">
                    <h3 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-secondary" />
                      Metas da Empresa
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {companyGoals.map((goal, i) => (
                        <GoalCard key={goal.id} goal={goal} index={i + 3} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Histórico — metas mensais arquivadas */}
                {(archivedMyGoals.length > 0 || archivedCompanyGoals.length > 0) && (
                  <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="mb-6">
                    <h3 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      Histórico
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[...archivedMyGoals, ...archivedCompanyGoals]
                        .sort((a, b) => (b.start_date > a.start_date ? 1 : -1))
                        .map((goal, i) => (
                          <GoalCard key={goal.id} goal={goal} index={i + 3} />
                        ))}
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Metas;
