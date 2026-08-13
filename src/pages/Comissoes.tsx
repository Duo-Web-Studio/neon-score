import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { parseISO } from "date-fns";
import { CheckCircle2, TrendingUp, Loader2, History, type LucideIcon } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { CommissionHistoryTable } from "@/components/dashboard/CommissionHistoryTable";
import { CommissionHistoryFilters } from "@/components/dashboard/CommissionHistoryFilters";
import { CurrentCycleCard } from "@/components/dashboard/CurrentCycleCard";
import { CommissionsMonthlyChart } from "@/components/dashboard/CommissionsMonthlyChart";
import { MrrSection } from "@/components/dashboard/MrrSection";
import { useCommissionHistory } from "@/hooks/useCommissionHistory";
import { useCurrentMonth } from "@/hooks/useCurrentMonth";

type Role = "SDR" | "Closer";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Comissoes() {
  const [role, setRole] = useState<Role>("Closer");
  const { periods, currentMonths, loading, totals } = useCommissionHistory({ scope: "self" });

  const { now } = useCurrentMonth();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");

  const availableYears = useMemo(() => {
    const ys = new Set<number>(periods.map((p) => parseISO(p.period_start).getFullYear()));
    ys.add(now.getFullYear());
    return Array.from(ys).sort((a, b) => b - a);
  }, [periods, now]);

  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => {
      const d = parseISO(p.period_start);
      if (d.getFullYear() !== selectedYear) return false;
      if (selectedMonth !== "all" && d.getMonth() !== selectedMonth) return false;
      return true;
    });
  }, [periods, selectedYear, selectedMonth]);

  const filterTotal = filteredPeriods.reduce((a, p) => a + p.commission_value, 0);
  const filterSummary = `${filteredPeriods.length} ciclo${filteredPeriods.length === 1 ? "" : "s"} · ${fmt(filterTotal)}`;

  const chartData = useMemo(
    () => [
      ...periods.map((p) => ({ period_start: p.period_start, value: p.commission_value })),
      ...currentMonths.map((c) => ({ period_start: c.period_start, value: c.commission_value })),
    ],
    [periods, currentMonths],
  );
  const currentPeriodStart = currentMonths[0]?.period_start;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <FloatingHeader role={role} onRoleChange={setRole} />
          <main className="flex-1 px-4 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <h2 className="text-2xl font-bold text-foreground">Minhas Comissões</h2>
              <p className="text-sm text-muted-foreground">
                Histórico mensal de comissões. O ciclo é fechado automaticamente todo dia 1º.
              </p>
            </motion.div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top KPIs (totals) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <KpiCard
                    label="Total recebido"
                    value={totals.paid}
                    sub="Comissões pagas"
                    icon={CheckCircle2}
                    accent="text-green-400"
                  />
                  <KpiCard
                    label="Total acumulado"
                    value={totals.total}
                    sub="Inclui o ciclo atual"
                    icon={TrendingUp}
                    accent="text-foreground"
                  />
                </div>

                {/* Current cycle */}
                <CurrentCycleCard currentMonths={currentMonths} />

                {/* Chart */}
                <CommissionsMonthlyChart data={chartData} currentPeriodStart={currentPeriodStart} />

                {/* Saúde da base recorrente (MRR) */}
                <MrrSection title="Caixa recorrente do mês" />


                {/* Histórico fechado */}
                <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-secondary" />
                    <h3 className="text-sm font-bold text-foreground">Histórico de Comissões Pagas</h3>
                  </div>
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
                    emptyMessage={`Nenhum ciclo fechado em ${
                      selectedMonth === "all"
                        ? selectedYear
                        : `${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][selectedMonth]}/${selectedYear}`
                    }.`}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <p className={`mt-2 text-2xl font-black ${accent}`}>{fmt(value)}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
