import { memo, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3 } from "lucide-react";

export interface MonthlyPoint {
  /** YYYY-MM-DD of the period start */
  period_start: string;
  value: number;
}

interface Props {
  data: MonthlyPoint[];
  currentPeriodStart?: string;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtBRLShort = (v: number) => {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `R$ ${v.toFixed(0)}`;
};

export const CommissionsMonthlyChart = memo(function CommissionsMonthlyChart({
  data,
  currentPeriodStart,
}: Props) {
  const chart = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => {
      map.set(d.period_start, (map.get(d.period_start) ?? 0) + d.value);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-12)
      .map(([period_start, value]) => ({
        period_start,
        value,
        label: format(parseISO(period_start), "MMM", { locale: ptBR }).toUpperCase().replace(".", ""),
        fullLabel: format(parseISO(period_start), "MMMM 'de' yyyy", { locale: ptBR }),
        isCurrent: currentPeriodStart === period_start,
      }));
  }, [data, currentPeriodStart]);

  const empty = chart.length < 2;

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="rounded-xl bg-muted/30 p-2.5">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Comissões por mês</h3>
          <p className="text-xs text-muted-foreground">Últimos 12 ciclos</p>
        </div>
      </div>

      {empty ? (
        <div className="flex items-center justify-center h-56">
          <p className="text-sm text-muted-foreground">Seu histórico vai aparecer aqui.</p>
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 12, right: 8, bottom: 4, left: -10 }}>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="hsl(0 0% 100% / 0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(240 4% 60%)", fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(240 4% 50%)", fontSize: 10 }}
                tickFormatter={fmtBRLShort}
                width={56}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
                content={<CustomTooltip />}
              />

              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {chart.map((entry, i) => (
                  <Cell
                    key={i}
                    fill="hsl(var(--primary))"
                    opacity={entry.isCurrent ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; fullLabel?: string; value: number } }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-border/40 bg-background/95 backdrop-blur px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {item.fullLabel}
      </div>
      <div className="mt-0.5 text-sm font-bold text-foreground">{fmtBRL(item.value)}</div>
    </div>
  );
}
