import { useState, useEffect, useMemo } from "react";
import { Loader2, Plus, Check, X, CalendarIcon, Clock, UserPlus, Search, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, startOfDay, isToday, isTomorrow, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  SelectSeparator,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseBRLInput, formatBRLNumber } from "@/lib/formatCurrency";
import { useDeals } from "@/hooks/useDeals";
import { useSections } from "@/hooks/useSections";
import { useClients, type DbClient } from "@/hooks/useClients";
import { useAuth } from "@/hooks/useAuth";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { findSuspectedDuplicates, type SuspectedDuplicate } from "@/lib/findDuplicateDeals";
import { DuplicateDealWarningDialog } from "@/components/dashboard/DuplicateDealWarningDialog";

const sourceSuggestions = [
  "Instagram", "Indicação", "Site", "Tráfego Pago",
  "Orgânico", "LinkedIn", "WhatsApp",
];

const presetColors = [
  "#FFD600", "#FF8F00", "#F57C00", "#3B82F6",
  "#10B981", "#A855F7", "#EF4444", "#06B6D4",
];

const followUpQuickOptions: { label: string; days: number }[] = [
  { label: "Hoje", days: 0 },
  { label: "Amanhã", days: 1 },
  { label: "+3 dias", days: 3 },
  { label: "+7 dias", days: 7 },
];

interface NewDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStage?: string;
  defaultSectionId?: string | null;
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="gradient-text text-sm font-bold tracking-wider">{number}</span>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
        {title}
      </h3>
    </div>
  );
}

function formatFollowUp(date: Date): string {
  const time = format(date, "HH:mm");
  if (isToday(date)) return `Hoje às ${time}`;
  if (isTomorrow(date)) return `Amanhã às ${time}`;
  return format(date, "EEE, d 'de' MMM 'às' HH:mm", { locale: ptBR });
}

function formatCurrencyBR(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = Number(digits) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrencyBR(formatted: string): number {
  if (!formatted) return 0;
  const digits = formatted.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
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

type ClientMode = "new" | "existing";

export function NewDealDialog({
  open,
  onOpenChange,
  defaultStage = "lead",
  defaultSectionId = null,
}: NewDealDialogProps) {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const { sections, createSection } = useSections();
  const { stages } = usePipelineStages();
  const { createDeal } = useDeals();
  const { clients, createClient, findMatchingClient } = useClients();

  // Modo de cliente
  const [clientMode, setClientMode] = useState<ClientMode>("new");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");

  // Dados do cliente (modo "novo")
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Dados do lead
  const [sectionId, setSectionId] = useState<string>(defaultSectionId ?? "none");
  const [stage, setStage] = useState(defaultStage);
  const [source, setSource] = useState("");
  const [value, setValue] = useState("");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");

  // Datas
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [followUpTime, setFollowUpTime] = useState("09:00");
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);
  const [meetingTime, setMeetingTime] = useState("10:00");

  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<SuspectedDuplicate[] | null>(null);

  // Inline section creation
  const [creatingSection, setCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionColor, setNewSectionColor] = useState(presetColors[0]);
  const [savingSection, setSavingSection] = useState(false);

  useEffect(() => {
    if (open) {
      setStage(defaultStage || stages[0]?.id || "lead");
      setSectionId(defaultSectionId ?? "none");
    }
  }, [open, defaultStage, defaultSectionId, stages]);

  const reset = () => {
    setClientMode("new");
    setSelectedClientId(null);
    setClientSearch("");
    setCompanyName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setSectionId("none");
    setStage(stages[0]?.id ?? "lead");
    setSource("");
    setValue("");
    setFollowUpDate(undefined);
    setFollowUpTime("09:00");
    setMeetingDate(undefined);
    setMeetingTime("10:00");
    setDescription("");
    setPriority("medium");
    setCreatingSection(false);
    setNewSectionName("");
  };

  // Sugestão inteligente: busca match enquanto digita
  const matchingClient = useMemo(() => {
    if (clientMode !== "new") return null;
    if (!companyName.trim() && !phone.trim() && !email.trim()) return null;
    return findMatchingClient({ company: companyName, phone, email });
  }, [clientMode, companyName, phone, email, findMatchingClient]);

  // Lista filtrada para o modo "existente"
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 20);
    const t = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(t) ||
        (c.company ?? "").toLowerCase().includes(t) ||
        (c.phone ?? "").toLowerCase().includes(t) ||
        (c.email ?? "").toLowerCase().includes(t),
    );
  }, [clients, clientSearch]);

  const selectedClient: DbClient | undefined = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId],
  );

  const applyExistingClient = (c: DbClient) => {
    setClientMode("existing");
    setSelectedClientId(c.id);
    setCompanyName(c.company ?? "");
    setContactName(c.name);
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
  };

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) {
      toast.error("Nome da seção é obrigatório");
      return;
    }
    setSavingSection(true);
    const { id, error } = await createSection({
      name: newSectionName.trim(),
      color: newSectionColor,
    });
    setSavingSection(false);
    if (error) {
      toast.error("Erro ao criar seção: " + error);
      return;
    }
    if (id) setSectionId(id);
    setCreatingSection(false);
    setNewSectionName("");
    toast.success("Seção criada!");
  };

  const setQuickFollowUp = (daysFromNow: number) => {
    setFollowUpDate(startOfDay(addDays(new Date(), daysFromNow)));
  };

  const isQuickFollowUpActive = (days: number) => {
    if (!followUpDate) return false;
    return isSameDay(followUpDate, startOfDay(addDays(new Date(), days)));
  };

  const buildIso = (d: Date | undefined, time: string): string | null => {
    if (!d) return null;
    const [hh, mm] = time.split(":").map(Number);
    const dt = new Date(d);
    dt.setHours(hh || 9, mm || 0, 0, 0);
    return dt.toISOString();
  };

  const followUpLabel = followUpDate
    ? formatFollowUp((() => {
        const [hh, mm] = followUpTime.split(":").map(Number);
        const d = new Date(followUpDate);
        d.setHours(hh || 9, mm || 0, 0, 0);
        return d;
      })())
    : null;

  const meetingLabel = meetingDate
    ? formatFollowUp((() => {
        const [hh, mm] = meetingTime.split(":").map(Number);
        const d = new Date(meetingDate);
        d.setHours(hh || 10, mm || 0, 0, 0);
        return d;
      })())
    : null;

  const performSave = async () => {
    setSaving(true);

    let clientId = selectedClientId;

    // Se é novo cliente, criar primeiro
    if (clientMode === "new") {
      const { id, error } = await createClient({
        name: contactName.trim(),
        company: companyName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      if (error || !id) {
        setSaving(false);
        toast.error("Erro ao cadastrar cliente: " + (error ?? "id ausente"));
        return;
      }
      clientId = id;
    }

    const { error } = await createDeal({
      contact_name: contactName.trim(),
      company_name: companyName.trim() || contactName.trim(),
      value: value ? parseCurrencyBR(value) : 0,
      stage,
      priority,
      section_id: sectionId,
      source: source.trim() || "Orgânico",
      contact_phone: phone.trim() || null,
      contact_email: email.trim() || null,
      description: description.trim() || null,
      next_action_at: buildIso(followUpDate, followUpTime),
      meeting_at: buildIso(meetingDate, meetingTime),
      client_id: clientId,
    });
    setSaving(false);

    if (error) {
      toast.error("Erro ao criar lead: " + error);
      return;
    }
    toast.success("Lead criado!");
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (clientMode === "existing" && !selectedClientId) {
      toast.error("Selecione um cliente existente");
      return;
    }
    if (clientMode === "new") {
      if (!companyName.trim()) {
        toast.error("Nome do cliente/empresa é obrigatório");
        return;
      }
      if (!contactName.trim()) {
        toast.error("Nome do contato é obrigatório");
        return;
      }
      if (!phone.trim() && !email.trim()) {
        toast.error("Informe ao menos um contato (telefone ou email)");
        return;
      }
    }
    if (sectionId === "none") {
      toast.error("Selecione uma seção");
      return;
    }

    // Checagem de duplicatas só quando já está fechando como ganho
    if (stage === "fechado_ganho") {
      const valueNum = value ? parseCurrencyBR(value) : 0;
      if (valueNum > 0) {
        setSaving(true);
        const dups = await findSuspectedDuplicates({
          client_id: selectedClientId,
          company_name: companyName.trim() || contactName.trim(),
          value: valueNum,
        });
        setSaving(false);
        if (dups.length > 0) {
          setDuplicateWarning(dups);
          return;
        }
      }
    }

    await performSave();
  };

  const inputClass = "h-11 rounded-lg";

  return (
    <>
    <DuplicateDealWarningDialog
      open={duplicateWarning !== null}
      onOpenChange={(o) => { if (!o) setDuplicateWarning(null); }}
      duplicates={duplicateWarning ?? []}
      onConfirmNew={async () => {
        setDuplicateWarning(null);
        await performSave();
      }}
      onCancel={() => setDuplicateWarning(null)}
    />
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto modal-scroll">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-yellow-orange glow-yellow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">Novo Lead</DialogTitle>
              <DialogDescription>Você será o responsável.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-7">
          {/* ============ 01 · CLIENTE ============ */}
          <section className="space-y-3">
            <SectionHeader number="01" title="Cliente" />

            {/* Toggle Novo / Existente */}
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => { setClientMode("new"); setSelectedClientId(null); }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
                  clientMode === "new"
                    ? "gradient-yellow-orange text-primary-foreground glow-yellow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <UserPlus className="h-4 w-4" />
                Novo cliente
              </button>
              <button
                type="button"
                onClick={() => setClientMode("existing")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
                  clientMode === "existing"
                    ? "gradient-yellow-orange text-primary-foreground glow-yellow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Search className="h-4 w-4" />
                Cliente existente
              </button>
            </div>

            {/* Modo: cliente existente */}
            {clientMode === "existing" && (
              <div className="space-y-3 rounded-xl border border-border/40 bg-card/40 p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Buscar por nome, empresa, telefone ou email..."
                    className={cn(inputClass, "pl-9")}
                  />
                </div>

                <div className="max-h-56 overflow-y-auto rounded-lg border border-border/40 bg-muted/20">
                  {filteredClients.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado
                    </p>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => applyExistingClient(c)}
                        className={cn(
                          "flex w-full flex-col items-start gap-0.5 border-b border-border/30 p-3 text-left text-sm transition-colors hover:bg-muted last:border-0",
                          selectedClientId === c.id && "bg-primary/10",
                        )}
                      >
                        <span className="font-medium text-foreground">{c.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {[c.company, c.phone, c.email].filter(Boolean).join(" · ") || "Sem contato"}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {selectedClient && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium text-primary">
                      <Check className="h-4 w-4" />
                      {selectedClient.name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {selectedClient.company} · {selectedClient.phone ?? selectedClient.email}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modo: novo cliente */}
            {clientMode === "new" && (
              <div className="space-y-3 rounded-xl border border-border/40 bg-card/40 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="company">Cliente / Empresa *</Label>
                    <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Acme Inc." className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact">Nome do contato *</Label>
                    <Input id="contact" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Ex: João Silva" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(formatPhoneBR(e.target.value))} placeholder="(11) 99999-9999" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" className={inputClass} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Informe ao menos telefone ou email.</p>

                {/* Sugestão inteligente */}
                {matchingClient && (
                  <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm glow-yellow">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        Esse cliente já existe: <span className="text-primary">{matchingClient.name}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Vincule este novo lead ao cadastro existente.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applyExistingClient(matchingClient)}
                      className="gradient-yellow-orange text-primary-foreground hover:opacity-90"
                    >
                      Usar existente
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ============ 02 · LEAD ============ */}
          <section className="space-y-3">
            <SectionHeader number="02" title="Lead" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="space-y-1.5">
                <Label>Seção *</Label>
                {creatingSection ? (
                  <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <Input autoFocus value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="Nome da seção" />
                    <div className="flex flex-wrap gap-1.5">
                      {presetColors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewSectionColor(c)}
                          className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                          style={{
                            backgroundColor: c,
                            borderColor: newSectionColor === c ? "hsl(var(--foreground))" : "transparent",
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={handleCreateSection} disabled={savingSection} className="gap-1">
                        {savingSection ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Salvar
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setCreatingSection(false); setNewSectionName(""); }} className="gap-1">
                        <X className="h-3 w-3" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Select value={sectionId} onValueChange={setSectionId}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Selecione uma seção" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>Selecione uma seção</SelectItem>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                      {isAdmin && (
                        <>
                          <SelectSeparator />
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCreatingSection(true); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="relative flex w-full cursor-pointer items-center gap-2 rounded-sm bg-primary/10 py-2 pl-8 pr-2 text-sm font-medium text-primary hover:bg-primary/20"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Criar nova seção
                          </button>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Etapa inicial</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="value">Valor estimado (R$)</Label>
                <Input
                  id="value"
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(formatCurrencyBR(e.target.value))}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    if (!pasted) return;
                    e.preventDefault();
                    const n = parseBRLInput(pasted);
                    setValue(n > 0 ? formatBRLNumber(n) : "");
                  }}
                  placeholder="0,00"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="source">Origem do lead</Label>
                <Input id="source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="De onde veio esse cliente?" className={inputClass} />
                <div className="flex flex-wrap gap-1.5">
                  {sourceSuggestions.map((s) => {
                    const active = source.toLowerCase() === s.toLowerCase();
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSource(s)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-all",
                          active
                            ? "gradient-yellow-orange text-primary-foreground glow-yellow"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ============ 03 · AGENDA & CONTEXTO ============ */}
          <section className="space-y-3">
            <SectionHeader number="03" title="Agenda & contexto" />

            <div className="space-y-4 rounded-xl border border-border/40 bg-card/40 p-4">
              {/* Follow-up */}
              <div className="space-y-2">
                <Label>Próximo follow-up</Label>
                <div className="flex flex-wrap gap-1.5">
                  {followUpQuickOptions.map((opt) => {
                    const active = isQuickFollowUpActive(opt.days);
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setQuickFollowUp(opt.days)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                          active
                            ? "gradient-yellow-orange text-primary-foreground glow-yellow"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                  {followUpDate && (
                    <button
                      type="button"
                      onClick={() => setFollowUpDate(undefined)}
                      className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3 w-3" /> Limpar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className={cn("h-11 justify-start rounded-lg text-left font-normal", !followUpDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {followUpLabel ?? "Escolher data..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 glass-card border-border/60" align="start">
                      <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} initialFocus locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                    <Input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className={cn(inputClass, timeInputClass, "w-full pl-9 sm:w-32")}
                      disabled={!followUpDate}
                    />
                  </div>
                </div>
              </div>

              {/* Reunião */}
              <div className="space-y-2">
                <Label>Reunião agendada (opcional)</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className={cn("h-11 flex-1 justify-start rounded-lg text-left font-normal", !meetingDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {meetingLabel ?? "Sem reunião agendada"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 glass-card border-border/60" align="start">
                      <Calendar mode="single" selected={meetingDate} onSelect={setMeetingDate} initialFocus locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                  {meetingDate && (
                    <>
                      <div className="relative">
                        <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                        <Input
                          type="time"
                          value={meetingTime}
                          onChange={(e) => setMeetingTime(e.target.value)}
                          className={cn(inputClass, timeInputClass, "w-full pl-9 sm:w-32")}
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setMeetingDate(undefined)} className="h-11 w-11 shrink-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Notas internas */}
              <div className="space-y-1.5">
                <Label htmlFor="description">Notas internas</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexto, dores do cliente, próximos passos combinados..." rows={3} className="rounded-lg" />
              </div>
            </div>
          </section>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="gap-2 gradient-yellow-orange text-primary-foreground glow-yellow hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Criar lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
