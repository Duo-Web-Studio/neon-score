import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2 } from "lucide-react";
import { CommissionPeriod } from "@/hooks/useCommissionHistory";

interface CommissionHistoryTableProps {
  periods: CommissionPeriod[];
  showSeller?: boolean;
  groupByMonth?: boolean;
  emptyMessage?: string;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPeriod = (start: string) => {
  try {
    return format(parseISO(start), "MMM/yyyy", { locale: ptBR });
  } catch {
    return start;
  }
};

const formatMonthLabel = (start: string) => {
  try {
    return format(parseISO(start), "MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return start;
  }
};

const formatPaidDate = (iso: string | null) => {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "dd/MM/yy");
  } catch {
    return "";
  }
};

export function CommissionHistoryTable({
  periods,
  showSeller = false,
  groupByMonth = false,
  emptyMessage = "Nenhum ciclo de comissão registrado ainda.",
}: CommissionHistoryTableProps) {
  const sorted = [...periods].sort((a, b) => (a.period_start < b.period_start ? 1 : -1));

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const Header = (
    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {showSeller && <span className="col-span-3">Vendedor</span>}
      <span className={showSeller ? "col-span-2" : "col-span-3"}>Ciclo</span>
      <span className="col-span-1 text-right">Vendas</span>
      <span className="col-span-2 text-right">Receita</span>
      <span className="col-span-1 text-right">Taxa</span>
      <span className="col-span-2 text-right">Comissão</span>
      <span className="col-span-1 text-right">Status</span>
    </div>
  );

  const renderRow = (row: CommissionPeriod) => (
    <li key={row.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm">
      {showSeller && (
        <span className="col-span-3 truncate font-medium text-foreground">
          {row.user_name ?? "—"}
        </span>
      )}
      <span className={`${showSeller ? "col-span-2" : "col-span-3"} capitalize text-foreground`}>
        {formatPeriod(row.period_start)}
      </span>
      <span className="col-span-1 text-right text-muted-foreground">{row.deals_count}</span>
      <span className="col-span-2 text-right font-medium text-foreground">{fmt(row.revenue)}</span>
      <span className="col-span-1 text-right text-muted-foreground">{Number(row.commission_rate).toFixed(2)}%</span>
      <span className="col-span-2 text-right font-bold text-secondary">{fmt(row.commission_value)}</span>
      <span className="col-span-1 flex items-center justify-end">
        <span className="inline-flex items-center gap-1 rounded-md bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          {row.paid_at ? `Pago ${formatPaidDate(row.paid_at)}` : "Pago"}
        </span>
      </span>
    </li>
  );

  if (!groupByMonth) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/40">
        {Header}
        <ul className="divide-y divide-border/30">{sorted.map(renderRow)}</ul>
      </div>
    );
  }

  // Group by period_start month
  const groups = new Map<string, CommissionPeriod[]>();
  sorted.forEach((p) => {
    const key = p.period_start;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  });

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([monthKey, rows]) => {
        const totalCommission = rows.reduce((a, r) => a + r.commission_value, 0);
        return (
          <div key={monthKey} className="overflow-hidden rounded-2xl border border-border/40 bg-card/40">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/30 bg-muted/20">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground capitalize">
                {formatMonthLabel(monthKey)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {rows.length} vendedor{rows.length === 1 ? "" : "es"} · {fmt(totalCommission)}
              </span>
            </div>
            {Header}
            <ul className="divide-y divide-border/30">{rows.map(renderRow)}</ul>
          </div>
        );
      })}
    </div>
  );
}
