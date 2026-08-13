import { useState, useEffect } from "react";
import { Loader2, CalendarIcon, Clock, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useDeals, type DbDeal } from "@/hooks/useDeals";
import { useSections } from "@/hooks/useSections";
import { useAuth } from "@/hooks/useAuth";
import { usePipelineStages } from "@/hooks/usePipelineStages";

interface DealDetailDialogProps {
  deal: DbDeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPhoneBR(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const timeInputClass =
  "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer";

function DateField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  hint?: string;
}) {
  const date = value ? new Date(value) : undefined;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date
                ? format(date, "EEE, d 'de' MMM 'às' HH:mm", { locale: ptBR })
                : "Sem data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 glass-card border-border/60" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (!d) {
                  onChange(null);
                  return;
                }
                const existing = date ?? new Date();
                d.setHours(existing.getHours() || 9, existing.getMinutes() || 0, 0, 0);
                onChange(d.toISOString());
              }}
              initialFocus
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <div className="relative">
          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            type="time"
            className={cn("w-32 pl-9", timeInputClass)}
            value={date ? format(date, "HH:mm") : ""}
            disabled={!date}
            onChange={(e) => {
              if (!date) return;
              const [hh, mm] = e.target.value.split(":").map(Number);
              const newD = new Date(date);
              newD.setHours(hh || 0, mm || 0, 0, 0);
              onChange(newD.toISOString());
            }}
          />
        </div>
        {date && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            title="Limpar"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function DealDetailDialog({ deal, open, onOpenChange }: DealDetailDialogProps) {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const { sections } = useSections();
  const { allStages } = usePipelineStages();
  const { updateDeal, deleteDeal } = useDeals();

  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState("lead");
  const [value, setValue] = useState("");
  const [priority, setPriority] = useState("medium");
  const [sectionId, setSectionId] = useState<string>("none");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [nextActionAt, setNextActionAt] = useState<string | null>(null);
  const [meetingAt, setMeetingAt] = useState<string | null>(null);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [closedByRole, setClosedByRole] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!deal) return;
    setContactName(deal.contact_name);
    setCompanyName(deal.company_name);
    setPhone(formatPhoneBR(deal.contact_phone ?? ""));
    setEmail(deal.contact_email ?? "");
    setStage(deal.stage);
    setValue(String(deal.value ?? ""));
    setPriority(deal.priority);
    setSectionId(deal.section_id ?? "none");
    setSource(deal.source ?? "");
    setDescription(deal.description ?? "");
    setNextActionAt(deal.next_action_at);
    setMeetingAt(deal.meeting_at);
    setClosedAt(deal.closed_at);
    setClosedByRole(deal.closed_by_role ?? "none");
  }, [deal]);

  if (!deal) return null;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateDeal(deal.id, {
      contact_name: contactName.trim(),
      company_name: companyName.trim(),
      contact_phone: phone.trim() || null,
      contact_email: email.trim() || null,
      stage,
      value: value ? Number(value) : 0,
      priority,
      section_id: sectionId === "none" ? null : sectionId,
      source: source.trim() || "organico",
      description: description.trim() || null,
      next_action_at: nextActionAt,
      meeting_at: meetingAt,
      closed_at: closedAt,
      closed_by_role: closedByRole === "none" ? null : (closedByRole as "sdr" | "closer"),
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error);
      return;
    }
    toast.success("Lead atualizado!");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!confirm("Excluir este lead definitivamente?")) return;
    const { error } = await deleteDeal(deal.id);
    if (error) {
      toast.error("Erro: " + error);
      return;
    }
    toast.success("Lead excluído");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto modal-scroll">
        <DialogHeader>
          <DialogTitle className="text-xl">Detalhes do lead</DialogTitle>
          <DialogDescription>
            Responsável: <span className="font-medium text-foreground">{deal.responsible_name}</span>
            {deal.closed_by_name && (
              <>
                {" · "}
                Convertido por:{" "}
                <span className="font-medium text-foreground">{deal.closed_by_name}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cliente */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sobre o cliente
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cliente / Empresa</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Nome do contato</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(formatPhoneBR(e.target.value))} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Lead */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sobre o lead
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Etapa</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allStages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Seção</Label>
                <Select value={sectionId} onValueChange={setSectionId}>
                  <SelectTrigger><SelectValue placeholder="Sem seção" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem seção</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" min={0} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Input value={source} onChange={(e) => setSource(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fechado como</Label>
                <Select value={closedByRole} onValueChange={setClosedByRole}>
                  <SelectTrigger><SelectValue placeholder="Não definido" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não definido</SelectItem>
                    <SelectItem value="sdr">SDR</SelectItem>
                    <SelectItem value="closer">Closer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Datas */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Datas importantes
            </h3>
            <DateField
              label="Próximo follow-up"
              value={nextActionAt}
              onChange={setNextActionAt}
              hint="Quando você precisa falar com esse lead novamente"
            />
            <DateField
              label="Reunião"
              value={meetingAt}
              onChange={setMeetingAt}
              hint="Data e hora marcada para reunião"
            />
            <DateField
              label="Previsão de fechamento"
              value={closedAt}
              onChange={setClosedAt}
              hint="Quando o lead deve ser fechado"
            />
          </div>

          <Separator />

          {/* Observações */}
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <div>
            <Button type="button" variant="ghost" onClick={handleDelete} className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </div>
          <Button type="button" onClick={handleSave} disabled={saving} className="gap-2 gradient-yellow-orange text-primary-foreground glow-yellow">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
