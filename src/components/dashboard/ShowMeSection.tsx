import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Trophy, TrendingDown, Target, Snowflake } from "lucide-react";
import { useDeals } from "@/hooks/useDeals";
import { useClients } from "@/hooks/useClients";
import { useCurrentMonth } from "@/hooks/useCurrentMonth";

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

export function ShowMeSection() {
  const { deals } = useDeals({ includeClosed: true });
  const { clients } = useClients();
  const { monthStart, monthEnd, monthKey } = useCurrentMonth();

  const meetingStats = useMemo(() => {
    const meetingsThisMonth = deals.filter((d) => {
      if (!d.meeting_at) return false;
      const m = new Date(d.meeting_at);
      return m >= monthStart && m < monthEnd;
    });

    const converted = meetingsThisMonth.filter((d) => d.stage === "fechado_ganho").length;
    const lost = meetingsThisMonth.filter((d) => d.stage === "fechado_perdido").length;
    const decided = converted + lost;
    const conversionRate = decided > 0 ? Math.round((converted / decided) * 100) : 0;
    const lossRate = decided > 0 ? 100 - conversionRate : 0;

    return { total: meetingsThisMonth.length, converted, lost, conversionRate, lossRate };
  }, [deals, monthStart, monthEnd]);

  const clientRanking = useMemo(() => {
    const byClient: Record<string, { won: number; lost: number }> = {};
    deals.forEach((d) => {
      if (!d.client_id) return;
      if (d.stage !== "fechado_ganho" && d.stage !== "fechado_perdido") return;
      if (!byClient[d.client_id]) byClient[d.client_id] = { won: 0, lost: 0 };
      if (d.stage === "fechado_ganho") byClient[d.client_id].won++;
      else byClient[d.client_id].lost++;
    });

    const rows = Object.entries(byClient)
      .map(([clientId, s]) => {
        const total = s.won + s.lost;
        const client = clients.find((c) => c.id === clientId);
        return {
          id: clientId,
          name: client?.name ?? "Cliente removido",
          company: client?.company ?? null,
          won: s.won,
          total,
          rate: total > 0 ? Math.round((s.won / total) * 100) : 0,
        };
      })
      .filter((r) => r.total >= 2);

    const top = [...rows].sort((a, b) => b.rate - a.rate || b.total - a.total).slice(0, 5);
    const bottom = [...rows].sort((a, b) => a.rate - b.rate || b.total - a.total).slice(0, 5);

    return { top, bottom };
  }, [deals, clients]);

  const kpis = [
    { label: "Reuniões no mês", value: String(meetingStats.total), icon: CalendarCheck, variant: "purple" as const, sub: null as string | null },
    { label: "Convertidas", value: String(meetingStats.converted), icon: Trophy, variant: "success" as const, sub: null },
    { label: "Perdidas pós-reunião", value: String(meetingStats.lost), icon: TrendingDown, variant: "destructive" as const, sub: null },
    { label: "Taxa de conversão", value: `${meetingStats.conversionRate}%`, icon: Target, variant: "cyan" as const, sub: `${meetingStats.lossRate}% perdidos` },
  ];

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mt-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-1 w-8 rounded-full gradient-yellow-orange" />
        <h3 className="text-lg font-bold text-foreground">Show me</h3>
        <span className="text-xs text-muted-foreground">Reuniões e conversão por cliente</span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const v = variantMap[k.variant];
          return (
            <div key={k.label} className="glass-card p-5 transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold text-foreground">{k.value}</p>
                  {k.sub && <p className="text-xs text-muted-foreground">{k.sub}</p>}
                </div>
                <div className={`rounded-xl p-2.5 ${v.iconBg}`}>
                  <k.icon className={`h-5 w-5 ${v.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15">
              <Trophy className="h-4 w-4 text-success" />
            </div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Maior taxa de conversão</h4>
          </div>
          {clientRanking.top.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem clientes com histórico suficiente ainda.</p>
          ) : (
            <div className="space-y-2">
              {clientRanking.top.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/20 text-xs font-bold text-success">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                    {c.company && <p className="truncate text-xs text-muted-foreground">{c.company}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-success">{c.rate}%</p>
                    <p className="text-xs text-muted-foreground">{c.won}/{c.total} vendas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/15">
              <Snowflake className="h-4 w-4 text-destructive" />
            </div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Menor taxa de conversão</h4>
          </div>
          {clientRanking.bottom.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem clientes com histórico suficiente ainda.</p>
          ) : (
            <div className="space-y-2">
              {clientRanking.bottom.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/20 text-xs font-bold text-destructive">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                    {c.company && <p className="truncate text-xs text-muted-foreground">{c.company}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-destructive">{c.rate}%</p>
                    <p className="text-xs text-muted-foreground">{c.won}/{c.total} vendas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
