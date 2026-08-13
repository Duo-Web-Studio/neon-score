import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Loader2, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { startOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface SellerHistoryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  memberId: string;
  memberName: string;
  initials: string;
  roles: string[];
  avatarGradient: string;
}

interface DealRow {
  id: string;
  value: number;
  closed_at: string | null;
  company_name: string | null;
  contact_name: string | null;
}

const tooltipStyle = {
  backgroundColor: "hsl(0, 0%, 8%)",
  border: "1px solid hsl(0, 0%, 16%)",
  borderRadius: "12px",
  color: "hsl(0, 0%, 100%)",
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CURRENT_MONTH_KEY = () => format(new Date(), "yyyy-MM");

function buildMonthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = startOfMonth(subMonths(now, i));
    const value = format(d, "yyyy-MM");
    const rawLabel = format(d, "MMMM yyyy", { locale: ptBR });
    opts.push({ value, label: rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1) });
  }
  return opts;
}

export function SellerHistoryDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  initials,
  roles,
  avatarGradient,
}: SellerHistoryDialogProps) {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(CURRENT_MONTH_KEY());
  const [totalMode, setTotalMode] = useState<"month" | "all">("month");
  const monthOptions = useMemo(() => buildMonthOptions(), []);

  // Sempre volta pro mês atual (e modo mensal) ao abrir
  useEffect(() => {
    if (open) {
      setSelectedMonth(CURRENT_MONTH_KEY());
      setTotalMode("month");
    }
  }, [open]);


  useEffect(() => {
    if (!open || !memberId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, value, closed_at, closed_by_user_id, user_id, company_name, contact_name")
        .eq("stage", "fechado_ganho")
        .or(`closed_by_user_id.eq.${memberId},user_id.eq.${memberId}`)
        .order("closed_at", { ascending: false })
        .limit(2000);
      if (cancelled) return;
      setDeals(
        (data ?? [])
          .filter((d) => d.closed_at)
          .map((d) => ({
            id: d.id,
            value: Number(d.value),
            closed_at: d.closed_at,
            company_name: d.company_name ?? null,
            contact_name: d.contact_name ?? null,
          }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, memberId]);

  const { monthTotal, monthCount, monthAvg, allTotal, monthlySeries, monthDeals } = useMemo(() => {
    let allTotal = 0;
    let monthTotal = 0;
    let monthCount = 0;
    const monthMap = new Map<string, { count: number; value: number; date: Date }>();
    const monthDeals: DealRow[] = [];

    deals.forEach((d) => {
      if (!d.closed_at) return;
      const dt = new Date(d.closed_at);
      const key = format(dt, "yyyy-MM");
      allTotal += d.value;

      if (key === selectedMonth) {
        monthTotal += d.value;
        monthCount += 1;
        monthDeals.push(d);
      }

      const entry = monthMap.get(key) ?? { count: 0, value: 0, date: startOfMonth(dt) };
      entry.count += 1;
      entry.value += d.value;
      monthMap.set(key, entry);
    });

    const now = new Date();
    const monthlySeries: { label: string; value: number; count: number; key: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = startOfMonth(subMonths(now, 11 - i));
      const key = format(d, "yyyy-MM");
      const entry = monthMap.get(key);
      const rawLabel = format(d, "MMM/yy", { locale: ptBR });
      monthlySeries.push({
        label: rawLabel,
        value: entry?.value ?? 0,
        count: entry?.count ?? 0,
        key,
      });
    }

    const monthAvg = monthCount > 0 ? monthTotal / monthCount : 0;
    monthDeals.sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""));

    return { monthTotal, monthCount, monthAvg, allTotal, monthlySeries, monthDeals };
  }, [deals, selectedMonth]);

  const selectedMonthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label ?? "Mês selecionado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-primary-foreground ${avatarGradient}`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground truncate">{memberName}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {roles.map((r) => (
                  <span
                    key={r}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                      r === "sdr"
                        ? "bg-primary/15 text-primary"
                        : r === "closer"
                        ? "bg-secondary/15 text-secondary"
                        : "bg-accent/15 text-accent"
                    }`}
                  >
                    {r.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Seletor de mês */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Faturamento por mês
                </p>
                <p className="text-sm text-foreground font-semibold">{selectedMonthLabel}</p>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m, i) => (
                    <SelectItem key={m.value} value={m.value}>
                      {i === 0 ? `${m.label} (mês atual)` : m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3 w-3" /> Faturado no mês
                </div>
                <p className="mt-1.5 text-lg font-black text-secondary">{formatCurrency(monthTotal)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {monthCount} venda{monthCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Ticket médio
                </div>
                <p className="mt-1.5 text-lg font-black text-primary">{formatCurrency(monthAvg)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">no mês selecionado</p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    {totalMode === "month" ? "Total do mês" : "Total geral"}
                  </div>
                  <div className="flex items-center gap-0.5 rounded-lg bg-muted/40 p-0.5">
                    {(["month", "all"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTotalMode(m)}
                        className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${
                          totalMode === m
                            ? "bg-foreground/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m === "month" ? "Mês" : "Todos"}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-1.5 text-lg font-black text-foreground">
                  {formatCurrency(totalMode === "month" ? monthTotal : allTotal)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {totalMode === "month" ? "acumulado no mês" : "todas as vendas do vendedor"}
                </p>
              </div>
            </div>


            {/* Chart: evolução mensal com destaque no mês selecionado */}
            <div className="rounded-2xl border border-border/40 bg-card/50 p-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySeries} barGap={4}>
                    <defs>
                      <linearGradient id="sellerHistGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(var(--secondary))" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,10%)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(240,4%,66%)", fontSize: 10 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(240,4%,66%)", fontSize: 10 }}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => [formatCurrency(v), "Receita"]}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {monthlySeries.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.key === selectedMonth ? "url(#sellerHistGrad)" : "hsl(0,0%,22%)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lista: vendas do mês selecionado */}
            <div className="rounded-2xl border border-border/40 bg-card/40">
              <div className="px-4 py-2.5 border-b border-border/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Vendas de {selectedMonthLabel}</span>
                <span>Valor</span>
              </div>
              {monthDeals.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sem vendas neste mês.</p>
              ) : (
                <ul className="divide-y divide-border/30 max-h-72 overflow-y-auto">
                  {monthDeals.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground truncate">
                          {d.company_name || d.contact_name || "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {d.closed_at ? format(new Date(d.closed_at), "dd 'de' MMM, yyyy", { locale: ptBR }) : "—"}
                        </span>
                      </div>
                      <span className="font-bold text-secondary shrink-0">{formatCurrency(d.value)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
