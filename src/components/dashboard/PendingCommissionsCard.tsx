import { useEffect, useMemo, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Loader2, DollarSign, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCommissionRates } from "@/hooks/useCommissionRates";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface PendingDeal {
  id: string;
  company_name: string;
  contact_name: string;
  value: number;
  closed_at: string | null;
  user_id: string;
  closed_by_user_id: string | null;
  closed_by_role: "sdr" | "closer" | "admin" | null;
  commission_paid_at: string | null;
  // computed
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_role_label: string;
  rate: number;
  commission_value: number;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export function PendingCommissionsCard() {
  const { user } = useAuth();
  const { getRate, loading: ratesLoading } = useCommissionRates();
  const [deals, setDeals] = useState<PendingDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PendingDeal | null>(null);
  const [search, setSearch] = useState("");

  const fetchPending = useCallback(async () => {
    setLoading(true);
    const { data: dealsData, error } = await supabase
      .from("deals")
      .select(
        "id, company_name, contact_name, value, closed_at, user_id, closed_by_user_id, closed_by_role, commission_paid_at",
      )
      .eq("stage", "fechado_ganho")
      .is("commission_paid_at", null)
      .order("closed_at", { ascending: false });

    if (error || !dealsData) {
      setDeals([]);
      setLoading(false);
      return;
    }

    const ids = new Set<string>();
    dealsData.forEach((d) => {
      if (d.user_id) ids.add(d.user_id);
      if (d.closed_by_user_id) ids.add(d.closed_by_user_id);
    });

    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", Array.from(ids)),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const nameMap = new Map<string, string>();
    profilesRes.data?.forEach((p) => nameMap.set(p.id, p.full_name));
    const rolesByUser = new Map<string, string[]>();
    rolesRes.data?.forEach((r) => {
      rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), r.role]);
    });

    const enriched: PendingDeal[] = dealsData.map((d) => {
      const beneficiary_id = d.closed_by_user_id ?? d.user_id;
      const userRoles = rolesByUser.get(beneficiary_id) ?? [];
      const rate = getRate(beneficiary_id, userRoles);
      const value = Number(d.value);
      const roleLabel =
        d.closed_by_role === "closer"
          ? "Closer"
          : d.closed_by_role === "sdr"
            ? "SDR"
            : userRoles.includes("closer")
              ? "Closer"
              : userRoles.includes("sdr")
                ? "SDR"
                : "—";
      return {
        ...d,
        value,
        beneficiary_id,
        beneficiary_name: nameMap.get(beneficiary_id) ?? "Sem responsável",
        beneficiary_role_label: roleLabel,
        rate,
        commission_value: Math.round((value * rate) / 100 * 100) / 100,
      };
    });

    setDeals(enriched);
    setLoading(false);
  }, [getRate]);

  useEffect(() => {
    if (!ratesLoading) fetchPending();
  }, [fetchPending, ratesLoading]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return deals;
    return deals.filter(
      (d) =>
        d.company_name.toLowerCase().includes(term) ||
        d.contact_name.toLowerCase().includes(term) ||
        d.beneficiary_name.toLowerCase().includes(term),
    );
  }, [deals, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (a, d) => ({
        revenue: a.revenue + d.value,
        commission: a.commission + d.commission_value,
        count: a.count + 1,
      }),
      { revenue: 0, commission: 0, count: 0 },
    );
  }, [filtered]);

  const handleConfirmPayment = async () => {
    if (!confirmTarget || !user) return;
    setPaying(confirmTarget.id);
    const { error } = await supabase
      .from("deals")
      .update({
        commission_paid_at: new Date().toISOString(),
        commission_paid_by: user.id,
      })
      .eq("id", confirmTarget.id);
    setPaying(null);
    setConfirmTarget(null);
    if (error) {
      toast.error("Erro ao marcar como pago: " + error.message);
      return;
    }
    toast.success("Comissão marcada como paga");
    fetchPending();
  };

  return (
    <>
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Vendas pendentes de pagamento</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {totals.count} venda{totals.count === 1 ? "" : "s"} · Receita {fmt(totals.revenue)} ·
              Comissão {fmt(totals.commission)}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Marque cada venda como paga após realizar o pagamento da comissão ao vendedor.
        </p>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou vendedor..."
            className="w-full rounded-xl border border-border/50 bg-muted/40 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhuma venda pendente de pagamento.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/40">
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="col-span-3">Cliente</span>
              <span className="col-span-3">Vendedor</span>
              <span className="col-span-1 text-right">Valor</span>
              <span className="col-span-1 text-right">Taxa</span>
              <span className="col-span-2 text-right">Comissão</span>
              <span className="col-span-2 text-right">Ação</span>
            </div>
            <ul className="divide-y divide-border/30">
              {filtered.map((d) => (
                <li key={d.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm">
                  <div className="col-span-3 min-w-0">
                    <p className="truncate font-medium text-foreground">{d.company_name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {d.contact_name}
                      {d.closed_at && (
                        <>
                          {" · "}
                          {format(parseISO(d.closed_at), "dd/MM/yy", { locale: ptBR })}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="truncate font-medium text-foreground">{d.beneficiary_name}</p>
                    <p className="text-[11px] text-muted-foreground">{d.beneficiary_role_label}</p>
                  </div>
                  <span className="col-span-1 text-right text-foreground">{fmt(d.value)}</span>
                  <span className="col-span-1 text-right text-muted-foreground">
                    {d.rate.toFixed(2)}%
                  </span>
                  <span className="col-span-2 text-right font-bold text-secondary">
                    {fmt(d.commission_value)}
                  </span>
                  <div className="col-span-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => setConfirmTarget(d)}
                      disabled={paying === d.id}
                      className="gap-1.5"
                    >
                      {paying === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Marcar pago
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pagamento de comissão</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                {confirmTarget && (
                  <>
                    <div className="rounded-xl bg-muted/30 p-3 space-y-1.5">
                      <Row label="Cliente" value={`${confirmTarget.company_name} — ${confirmTarget.contact_name}`} />
                      <Row
                        label="Vendedor"
                        value={`${confirmTarget.beneficiary_name} (${confirmTarget.beneficiary_role_label})`}
                      />
                      <Row label="Valor da venda" value={fmt(confirmTarget.value)} />
                      <Row label="Taxa" value={`${confirmTarget.rate.toFixed(2)}%`} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-secondary/40 bg-secondary/10 px-3 py-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Comissão a pagar
                      </span>
                      <span className="text-lg font-black text-secondary">
                        {fmt(confirmTarget.commission_value)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Esta ação registra o pagamento como concluído e move a venda para o histórico de
                      comissões pagas.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!paying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmPayment();
              }}
              disabled={!!paying}
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Confirmando...
                </>
              ) : (
                "Confirmar pagamento"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
