import { Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CurrentMonthCommission } from "@/hooks/useCommissionHistory";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface CurrentCycleCardProps {
  currentMonths: CurrentMonthCommission[];
  showSeller?: boolean;
}

export function CurrentCycleCard({ currentMonths, showSeller = false }: CurrentCycleCardProps) {
  const monthLabel = currentMonths[0]
    ? format(parseISO(currentMonths[0].period_start), "MMMM 'de' yyyy", { locale: ptBR })
    : "";

  const totalRevenue = currentMonths.reduce((a, c) => a + c.revenue, 0);
  const totalCommission = currentMonths.reduce((a, c) => a + c.commission_value, 0);
  const totalDeals = currentMonths.reduce((a, c) => a + c.deals_count, 0);

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/50 to-secondary/10 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Clock className="h-3 w-3" /> Em aberto
          </span>
          <span className="text-sm font-semibold text-foreground capitalize">{monthLabel}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{totalDeals} venda{totalDeals === 1 ? "" : "s"}</span>
          <span>Receita: <span className="text-foreground font-medium">{fmt(totalRevenue)}</span></span>
          <span>Comissão: <span className="text-secondary font-bold">{fmt(totalCommission)}</span></span>
        </div>
      </div>

      {showSeller ? (
        currentMonths.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum vendedor no ciclo atual.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/30 bg-card/40">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="col-span-5">Vendedor</span>
              <span className="col-span-1 text-right">Vendas</span>
              <span className="col-span-3 text-right">Receita</span>
              <span className="col-span-1 text-right">Taxa</span>
              <span className="col-span-2 text-right">Comissão</span>
            </div>
            <ul className="divide-y divide-border/30">
              {[...currentMonths]
                .sort((a, b) => b.commission_value - a.commission_value)
                .map((c) => (
                  <li key={c.user_id} className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 text-sm">
                    <span className="col-span-5 truncate font-medium text-foreground">
                      {c.user_name ?? "—"}
                    </span>
                    <span className="col-span-1 text-right text-muted-foreground">{c.deals_count}</span>
                    <span className="col-span-3 text-right text-foreground">{fmt(c.revenue)}</span>
                    <span className="col-span-1 text-right text-muted-foreground">
                      {c.commission_rate.toFixed(2)}%
                    </span>
                    <span className="col-span-2 text-right font-bold text-secondary">
                      {fmt(c.commission_value)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Vendas" value={String(totalDeals)} />
          <MiniStat label="Receita" value={fmt(totalRevenue)} />
          <MiniStat label="Comissão prevista" value={fmt(totalCommission)} accent />
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-card/60 border border-border/30 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-black ${accent ? "text-secondary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
