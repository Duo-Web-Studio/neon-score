import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Search, Trash2, Briefcase } from "lucide-react";
import { useDeals } from "@/hooks/useDeals";
import { useToast } from "@/hooks/use-toast";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useApprovedUsers } from "@/hooks/useApprovedUsers";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export function DeleteDealsManager() {
  const { deals, loading, deleteDeal, fetchDeals } = useDeals({ includeClosed: true });
  const { dbStages } = usePipelineStages();
  const { users } = useApprovedUsers();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [target, setTarget] = useState<typeof deals[number] | null>(null);

  const stagesMap = useMemo(() => {
    const map = new Map<string, { title: string; color: string }>();
    dbStages.forEach((s) => map.set(s.key, { title: s.title, color: s.color }));
    return map;
  }, [dbStages]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return deals
      .filter((d) => (stageFilter === "all" ? true : d.stage === stageFilter))
      .filter((d) => (userFilter === "all" ? true : d.user_id === userFilter || d.closed_by_user_id === userFilter))
      .filter((d) => {
        if (!term) return true;
        return (
          d.company_name.toLowerCase().includes(term) ||
          d.contact_name.toLowerCase().includes(term) ||
          (d.responsible_name ?? "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const ad = a.closed_at ? new Date(a.closed_at).getTime() : new Date(a.created_at).getTime();
        const bd = b.closed_at ? new Date(b.closed_at).getTime() : new Date(b.created_at).getTime();
        return bd - ad;
      });
  }, [deals, search, stageFilter, userFilter]);

  const handleDelete = async () => {
    if (!target) return;
    setDeleting(target.id);
    const { error } = await deleteDeal(target.id);
    setDeleting(null);
    setTarget(null);
    if (error) {
      toast({ title: "Erro ao excluir", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Venda excluída" });
    fetchDeals();
  };

  return (
    <section className="space-y-5">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Briefcase className="h-5 w-5 text-primary" />
          Gerenciar Vendas
        </h3>
        <p className="text-sm text-muted-foreground">
          Visualize todas as vendas do funil e remova registros incorretos. A exclusão recalcula automaticamente as metas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative md:col-span-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por empresa, contato ou vendedor..."
            className="w-full rounded-xl border border-border/50 bg-muted/40 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="md:col-span-3">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Estágio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estágios</SelectItem>
              {dbStages.map((s) => (
                <SelectItem key={s.id} value={s.key}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-1 font-semibold text-foreground">Nenhuma venda encontrada</p>
          <p className="text-sm text-muted-foreground">Ajuste os filtros para ver mais resultados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const stage = stagesMap.get(d.stage);
            return (
              <div
                key={d.id}
                className="glass-card flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{d.company_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.contact_name}
                    {" · "}
                    Resp: {d.responsible_name}
                    {d.closed_by_name && d.closed_by_name !== d.responsible_name && (
                      <> {" · "} Fechou: {d.closed_by_name}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${stage?.color ?? "#888"}25`,
                      color: stage?.color ?? "hsl(var(--muted-foreground))",
                    }}
                  >
                    {stage?.title ?? d.stage}
                  </span>
                  <span className="text-sm font-bold text-foreground">{fmtBRL(d.value || 0)}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {d.closed_at
                    ? `Fechada ${format(new Date(d.closed_at), "dd/MM/yy", { locale: ptBR })}`
                    : `Criada ${format(new Date(d.created_at), "dd/MM/yy", { locale: ptBR })}`}
                </span>
                <button
                  type="button"
                  onClick={() => setTarget(d)}
                  disabled={deleting === d.id}
                  className="flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                >
                  {deleting === d.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Excluir
                </button>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta venda?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                {target && (
                  <>
                    <div className="rounded-xl bg-muted/30 p-3 space-y-1.5 text-sm">
                      <Row label="Cliente" value={`${target.company_name} — ${target.contact_name}`} />
                      <Row label="Vendedor responsável" value={target.responsible_name ?? "—"} />
                      {target.closed_by_name && (
                        <Row label="Quem fechou" value={target.closed_by_name} />
                      )}
                      <Row label="Estágio" value={stagesMap.get(target.stage)?.title ?? target.stage} />
                      <Row label="Valor" value={fmtBRL(target.value || 0)} />
                    </div>
                    <p className="text-xs text-destructive">
                      Esta ação é permanente. As metas vinculadas serão recalculadas automaticamente.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={!!deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                "Excluir venda"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
