import { memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import {
  UserPlus,
  UserMinus,
  TrendingUp,
  Wallet,
  Activity,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { useMrrMetrics } from "@/hooks/useMrrMetrics";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

interface MrrSectionProps {
  compact?: boolean;
  title?: string;
}

export const MrrSection = memo(function MrrSection({
  compact = false,
  title = "Saúde da base recorrente",
}: MrrSectionProps) {
  const { current, series, result, loading } = useMrrMetrics(6);

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse h-40 mb-6">
        <div className="h-4 w-48 bg-muted/40 rounded mb-4" />
        <div className="h-20 bg-muted/30 rounded" />
      </div>
    );
  }

  const resultStyle =
    result === "positivo"
      ? "bg-success/15 text-success border-success/30"
      : result === "negativo"
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : "bg-muted/30 text-muted-foreground border-border/50";

  return (
    <section className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {title}
          </h3>
          <p className="text-xs text-muted-foreground/80 mt-1">
            Receita nova, receita perdida (churn) e receita que deixou de ganhar (pipeline)
          </p>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1.5 rounded-full border ${resultStyle}`}
        >
          {result === "positivo"
            ? "Resultado positivo"
            : result === "negativo"
              ? "Resultado negativo"
              : "Resultado neutro"}
        </span>
      </div>

      <div
        className={`grid grid-cols-2 gap-3 ${
          compact ? "lg:grid-cols-3" : "sm:grid-cols-3 lg:grid-cols-6"
        }`}
      >
        <MrrCard
          label="Clientes novos"
          value={current.newClients.toString()}
          icon={UserPlus}
          accent="text-success"
        />
        <MrrCard
          label="Receita nova"
          value={fmt(current.newMrr)}
          icon={TrendingUp}
          accent="text-success"
        />
        {!compact && (
          <MrrCard
            label="Cliente perdido"
            value={current.churnedClients.toString()}
            icon={UserMinus}
            accent="text-destructive"
          />
        )}
        {!compact && (
          <MrrCard
            label="Deixou de ganhar"
            value={fmt(current.missedMrr)}
            icon={AlertTriangle}
            accent="text-secondary"
          />
        )}
        <MrrCard
          label="Saldo líquido"
          value={fmt(current.netMrr)}
          icon={Wallet}
          accent={
            current.netMrr > 0
              ? "text-success"
              : current.netMrr < 0
                ? "text-destructive"
                : "text-foreground"
          }
        />
        {!compact && (
          <MrrCard
            label="Resultado"
            value={
              result === "positivo"
                ? "Positivo"
                : result === "negativo"
                  ? "Negativo"
                  : "Neutro"
            }
            icon={Activity}
            accent={
              result === "positivo"
                ? "text-success"
                : result === "negativo"
                  ? "text-destructive"
                  : "text-muted-foreground"
            }
          />
        )}
      </div>

      <div className="glass-card p-6">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Comparativo mensal — Receita recorrente
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 14%)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                tickFormatter={(v) => fmt(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 8%)",
                  border: "1px solid hsl(0, 0%, 16%)",
                  borderRadius: "12px",
                  color: "hsl(0, 0%, 100%)",
                }}
                formatter={(v: number) => fmt(Number(v))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="newMrr" name="Receita nova" fill="hsl(142, 70%, 45%)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="missedMrr" name="Deixou de ganhar" fill="hsl(32, 95%, 55%)" radius={[6, 6, 0, 0]} />
              <Line
                dataKey="netMrr"
                name="Saldo líquido"
                type="monotone"
                stroke="#FFD600"
                strokeWidth={3}
                dot={{ fill: "#FFD600", r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
});

function MrrCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
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
      <p className={`mt-2 text-xl font-black ${accent}`}>{value}</p>
    </div>
  );
}
