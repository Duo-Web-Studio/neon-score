import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { useClients, type DbClient, type ClientStatus } from "@/hooks/useClients";
import { useDeals } from "@/hooks/useDeals";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Building2, Phone, Mail, DollarSign, UserCheck, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;
type StatusFilter = "todos" | "ativo" | "perdido";


type Role = "SDR" | "Closer";

function monthKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return iso.slice(0, 7); // YYYY-MM
}

function buildMonthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return opts;
}

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}


export default function Clientes() {
  const { clients, loading, deleteClient, updateClient } = useClients();
  // Carrega TODOS os deals (incluindo fechados) para mostrar histórico
  const { deals, loading: dealsLoading, deleteDeal } = useDeals({ includeClosed: true });
  const { roles } = useAuth();
  const { toast } = useToast();
  const isAdmin = roles.includes("admin");

  const [role, setRole] = useState<Role>("Closer");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [monthFilter, setMonthFilter] = useState<string>("todos");
  
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [page, setPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<DbClient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<string | null>(null);
  const [deletingDeal, setDeletingDeal] = useState(false);


  const handleDelete = async () => {
    if (!selectedClient) return;
    setDeleting(true);
    const { error } = await deleteClient(selectedClient.id, { cascadeDeals: true });
    setDeleting(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: error, variant: "destructive" });
      return;
    }
    toast({
      title: "Cliente excluído",
      description: `${selectedClient.name} e todas as vendas associadas foram removidos.`,
    });
    setConfirmOpen(false);
    setSelectedClient(null);
  };

  const handleDeleteDeal = async () => {
    if (!dealToDelete) return;
    setDeletingDeal(true);
    const { error } = await deleteDeal(dealToDelete);
    setDeletingDeal(false);
    if (error) {
      toast({ title: "Erro ao excluir venda", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Venda excluída", description: "Removida de todo o sistema." });
    setDealToDelete(null);
  };

  const enriched = useMemo(() => {
    return clients.map((c) => {
      const cDeals = deals.filter((d) => d.client_id === c.id);
      const won = cDeals.filter((d) => d.stage === "fechado_ganho");
      const totalConverted = won.reduce((sum, d) => sum + Number(d.value), 0);
      return {
        client: c,
        dealsCount: cDeals.length,
        wonCount: won.length,
        totalConverted,
      };
    });
  }, [clients, deals]);

  const filtered = useMemo(() => {
    // Regra base: só mostra quem entrou (activated_at) ou saiu (churned_at) do negócio.
    // Só mostra clientes que já foram convertidos (pelo menos 1 venda ganha).
    let list = enriched.filter(
      (e) => e.wonCount > 0 || e.client.status === "perdido" || !!e.client.churned_at,
    );


    if (statusFilter !== "todos") {
      list = list.filter((e) => e.client.status === statusFilter);
    }

    if (monthFilter !== "todos") {
      list = list.filter(({ client: c }) => {
        return (
          monthKey(c.activated_at) === monthFilter ||
          monthKey(c.churned_at) === monthFilter
        );
      });
    }

    if (!search.trim()) return list;
    const t = search.toLowerCase();
    return list.filter(
      ({ client: c }) =>
        c.name.toLowerCase().includes(t) ||
        (c.company ?? "").toLowerCase().includes(t) ||
        (c.phone ?? "").toLowerCase().includes(t) ||
        (c.email ?? "").toLowerCase().includes(t),
    );
  }, [enriched, search, statusFilter, monthFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, monthFilter]);



  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const clientDeals = useMemo(
    () => (selectedClient ? deals.filter((d) => d.client_id === selectedClient.id) : []),
    [selectedClient, deals],
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <FloatingHeader role={role} onRoleChange={setRole} />

          <main className="flex-1 px-3 sm:px-4 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                  <UserCheck className="h-6 w-6 text-primary" />
                  Clientes
                </h2>
                <p className="text-sm text-muted-foreground">
                  Base de clientes e histórico de negociações
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-44">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os meses</SelectItem>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="h-9 w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos status</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="perdido">Perdidos</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full sm:w-64 rounded-xl border border-border/50 bg-muted/40 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>

            </motion.div>

            {loading || dealsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <UserCheck className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">
                  {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Clientes aparecem aqui quando são ativados ou saem do negócio
                </p>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">MRR</TableHead>
                      <TableHead>Entrou em</TableHead>
                      <TableHead>Saiu em</TableHead>
                      <TableHead className="text-right">Total convertido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map(({ client, totalConverted }) => (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelectedClient(client)}
                      >
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {client.company ?? "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={client.status} />
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {Number(client.monthly_revenue) > 0
                            ? `R$ ${Number(client.monthly_revenue).toLocaleString("pt-BR")}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateBR(client.activated_at)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateBR(client.churned_at)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-secondary">
                          R$ {totalConverted.toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>

                    ))}
                  </TableBody>
                </Table>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {filtered.length} cliente{filtered.length === 1 ? "" : "s"}
                    {filtered.length > PAGE_SIZE && (
                      <>
                        {" · "}Mostrando {(currentPage - 1) * PAGE_SIZE + 1}
                        {"–"}
                        {Math.min(currentPage * PAGE_SIZE, filtered.length)}
                      </>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Drawer com histórico do cliente */}
      <Sheet open={!!selectedClient} onOpenChange={(o) => !o && setSelectedClient(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedClient && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedClient.name}</SheetTitle>
                <SheetDescription>
                  {selectedClient.company && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {selectedClient.company}
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {selectedClient.phone}
                    </div>
                  )}
                  {selectedClient.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {selectedClient.email}
                    </div>
                  )}
                </SheetDescription>
              </SheetHeader>

              <ClientStatusEditor
                key={selectedClient.id}
                client={selectedClient}
                onSave={async (updates) => {
                  const { error } = await updateClient(selectedClient.id, updates);
                  if (error) {
                    toast({ title: "Erro ao salvar", description: error, variant: "destructive" });
                  } else {
                    toast({ title: "Cliente atualizado" });
                  }
                }}
              />


              <div className="mt-6">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Histórico de leads ({clientDeals.length})
                </h4>
                {clientDeals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum lead para este cliente.</p>
                ) : (
                  <div className="space-y-2">
                    {clientDeals.map((d) => (
                      <div key={d.id} className="rounded-lg border border-border/50 p-3 bg-muted/20">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="text-sm font-medium truncate">{d.contact_name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md ${
                                d.stage === "fechado_ganho"
                                  ? "bg-success/15 text-success"
                                  : d.stage === "fechado_perdido"
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-primary/15 text-primary"
                              }`}
                            >
                              {d.stage}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => setDealToDelete(d.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
                                aria-label="Excluir venda"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            R$ {Number(d.value).toLocaleString("pt-BR")}
                          </span>
                          <span>{new Date(d.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        {d.closed_by_name && (
                          <div className="text-[10px] text-muted-foreground/80 mt-1">
                            Convertido por {d.closed_by_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedClient.notes && (
                <div className="mt-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Observações
                  </h4>
                  <p className="text-sm text-foreground/80">{selectedClient.notes}</p>
                </div>
              )}

              {isAdmin && (
                <div className="mt-8 pt-6 border-t border-border/50">
                  <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full" disabled={deleting}>
                        {deleting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Excluir cliente
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir {selectedClient.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O cliente e todas as{" "}
                          <strong>{clientDeals.length} venda(s) associada(s)</strong> serão
                          removidas de todo o sistema (Organização, Pipeline, Performance,
                          Metas e Comissões).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                          }}
                          disabled={deleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Excluindo...
                            </>
                          ) : (
                            "Excluir"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!dealToDelete} onOpenChange={(o) => !o && setDealToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta venda?</AlertDialogTitle>
            <AlertDialogDescription>
              A venda será removida permanentemente de todo o sistema. Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingDeal}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteDeal();
              }}
              disabled={deletingDeal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingDeal ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

const STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: "Ativo",
  perdido: "Perdido",
};

function StatusBadge({ status }: { status: ClientStatus }) {
  const styles: Record<ClientStatus, string> = {
    ativo: "bg-success/15 text-success",
    perdido: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${styles[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const CHURN_REASONS = [
  "Preço",
  "Sem uso / sem valor percebido",
  "Mudou para concorrente",
  "Problemas de suporte",
  "Encerrou operação",
  "Outro",
];

function ClientStatusEditor({
  client,
  onSave,
}: {
  client: DbClient;
  onSave: (updates: Partial<DbClient>) => Promise<void>;
}) {
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [mrr, setMrr] = useState<string>(String(client.monthly_revenue ?? 0));
  const [churnedAt, setChurnedAt] = useState<string>(client.churned_at ?? "");
  const [reason, setReason] = useState<string>(client.churn_reason ?? "");
  const [churnNotes, setChurnNotes] = useState<string>(client.churn_notes ?? "");
  const [saving, setSaving] = useState(false);

  const isChurn = status !== "ativo";

  const handleSave = async () => {
    setSaving(true);
    const updates: Partial<DbClient> = {
      status,
      monthly_revenue: Number(mrr) || 0,
    };
    if (isChurn) {
      updates.churned_at = churnedAt || new Date().toISOString().slice(0, 10);
      updates.churn_reason = reason || null;
      updates.churn_notes = churnNotes || null;
    } else {
      updates.churned_at = null;
      updates.churn_reason = null;
      updates.churn_notes = null;
    }
    await onSave(updates);
    setSaving(false);
  };

  return (
    <div className="mt-6 rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Status & receita recorrente
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="perdido">Perdido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">MRR (R$/mês)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={mrr}
            onChange={(e) => setMrr(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {isChurn && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data de saída</Label>
              <Input
                type="date"
                value={churnedAt}
                onChange={(e) => setChurnedAt(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CHURN_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea
              value={churnNotes}
              onChange={(e) => setChurnNotes(e.target.value)}
              rows={2}
              className="resize-none"
              placeholder="Detalhes opcionais sobre a saída..."
            />
          </div>
        </>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Salvar alterações
      </Button>
    </div>
  );
}
