import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Handshake } from "lucide-react";

interface CloseDealRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (role: "sdr" | "closer") => void;
}

export function CloseDealRoleDialog({ open, onOpenChange, onSelect }: CloseDealRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fechar como…</DialogTitle>
          <DialogDescription>
            Você atua como SDR e Closer. Indique em qual papel está fechando este lead.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => onSelect("sdr")}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-muted/40 p-6 transition-all hover:border-primary hover:bg-primary/10 hover:glow-yellow"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl gradient-yellow-orange text-primary-foreground">
              <Phone className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-foreground">SDR</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Prospecção</span>
          </button>

          <button
            type="button"
            onClick={() => onSelect("closer")}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-muted/40 p-6 transition-all hover:border-secondary hover:bg-secondary/10"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-accent text-primary-foreground">
              <Handshake className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-foreground">Closer</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Fechamento</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
