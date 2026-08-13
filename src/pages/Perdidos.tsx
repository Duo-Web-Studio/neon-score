import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { useDeals } from "@/hooks/useDeals";
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
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, FileX, RotateCcw, MessageCircle } from "lucide-react";

type Role = "SDR" | "Closer";

export default function Perdidos() {
  const { deals, loading, updateDeal } = useDeals({ includeClosed: true });
  const { toast } = useToast();

  const [role, setRole] = useState<Role>("Closer");
  const [search, setSearch] = useState("");
  const [reactivateId, setReactivateId] = useState<string | null>(null);
  const [reactivating, setReactivating] = useState(false);

  const lostDeals = useMemo(
    () => deals.filter((d) => d.stage === "fechado_perdido"),
    [deals],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return lostDeals;
    const t = search.toLowerCase();
    return lostDeals.filter(
      (d) =>
        d.contact_name.toLowerCase().includes(t) ||
        d.company_name.toLowerCase().includes(t) ||
        (d.responsible_name ?? "").toLowerCase().includes(t),
    );
  }, [lostDeals, search]);

  const totalPotentialValue = useMemo(
    () => lostDeals.reduce((sum, d) => sum + Number(d.value), 0),
    [lostDeals],
  );

  const handleReactivate = async () => {
    if (!reactivateId) return;
    setReactivating(true);
    const { error } = await updateDeal(reactivateId, {
      stage: "lead",
      closed_at: null,
    });
    setReactivating(false);
    setReactivateId(null);
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
      return;
    }
    toast({
      title: "Contrato reaberto",
      description: "O contrato voltou para a coluna Lead no pipeline.",
    });
  };

  const openWhatsApp = (
    phone: string,
    contactName: string,
    companyName: string,
  ) => {
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned) return;
    const msg = encodeURIComponent(
      `Olá ${contactName}, tudo bem? Gostaria de retomar nossa conversa sobre ${companyName}.`,
    );
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <FloatingHeader role={role} onRoleChange={setRole} />

          <main className="flex-1 px-3 sm:px-4 pb-8 overflow-x-hidden">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                  <FileX className="h-6 w-6 text-muted-foreground" />
                  Contratos sem conversão
                </h2>
                <p className="text-sm text-muted-foreground">
                  {lostDeals.length} contrato{lostDeals.length === 1 ? "" : "s"}{" "}
                  sem conversão · Valor potencial: R${" "}
                  {totalPotentialValue.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar contrato..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full sm:w-72 rounded-xl border border-border/50 bg-muted/40 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
            </motion.div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <FileX className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">
                  {search
                    ? "Nenhum contrato encontrado"
                    : "Nenhum contrato sem conversão até o momento"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Contratos encerrados sem conversão no pipeline aparecem aqui
                </p>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contato</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Encerrado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">
                            {d.contact_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {d.company_name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.responsible_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            R$ {Number(d.value).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.closed_at
                              ? new Date(d.closed_at).toLocaleDateString(
                                  "pt-BR",
                                )
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              {d.contact_phone && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
                                      onClick={() =>
                                        openWhatsApp(
                                          d.contact_phone!,
                                          d.contact_name,
                                          d.company_name,
                                        )
                                      }
                                    >
                                      <MessageCircle className="h-3.5 w-3.5" />
                                      WhatsApp
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Enviar mensagem no WhatsApp
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => setReactivateId(d.id)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reativar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              </div>
            )}
          </main>
        </div>
      </div>

      <AlertDialog
        open={!!reactivateId}
        onOpenChange={(o) => !o && setReactivateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir este contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              O contrato voltará para a coluna <strong>Lead</strong> no pipeline
              e poderá ser trabalhado novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reactivating}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={reactivating}
            >
              {reactivating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Reabrir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
