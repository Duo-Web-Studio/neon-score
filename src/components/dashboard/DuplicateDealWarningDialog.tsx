import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SuspectedDuplicate } from "@/lib/findDuplicateDeals";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: SuspectedDuplicate[];
  onConfirmNew: () => void;
  onCancel: () => void;
}

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export function DuplicateDealWarningDialog({
  open,
  onOpenChange,
  duplicates,
  onConfirmNew,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 text-secondary">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Possível venda duplicada</DialogTitle>
              <DialogDescription>
                Já existe {duplicates.length === 1 ? "uma venda" : `${duplicates.length} vendas`} fechada{duplicates.length === 1 ? "" : "s"} com o mesmo cliente e valor nos últimos dias.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {duplicates.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-border/50 bg-muted/30 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">
                  {d.company_name || d.contact_name}
                </span>
                <span className="font-mono font-semibold text-primary">
                  {formatBRL(d.value)}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Fechada por <span className="text-foreground">{d.closed_by_name ?? "—"}</span>
                {d.closed_at &&
                  ` em ${format(new Date(d.closed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}`}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          É uma <strong className="text-foreground">venda nova de verdade</strong> ou foi <strong className="text-foreground">a mesma venda</strong> que outra pessoa já tinha lançado?
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            Era a mesma — cancelar
          </Button>
          <Button
            onClick={onConfirmNew}
            className="gradient-yellow-orange text-primary-foreground"
          >
            É venda nova, confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
