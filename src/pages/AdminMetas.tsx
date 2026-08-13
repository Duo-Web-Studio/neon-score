import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { parseBRLInput } from "@/lib/formatCurrency";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Target,
  Plus,
  Trash2,
  Users,
  Building2,
  Loader2,
  Calendar,
  CalendarIcon,
  DollarSign,
  User,
  Pencil,
  Check,
  X,
} from "lucide-react";

// Currency helpers (BRL)
const formatCurrencyBRL = (digitsOnly: string): string => {
  if (!digitsOnly) return "";
  const cents = parseInt(digitsOnly, 10);
  if (isNaN(cents)) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const currencyToNumber = (digitsOnly: string): number => {
  if (!digitsOnly) return 0;
  return parseInt(digitsOnly, 10) / 100;
};

const numberToDigits = (value: number): string => {
  if (!value) return "";
  return Math.round(value * 100).toString();
};

const handleCurrencyPaste = (
  e: React.ClipboardEvent<HTMLInputElement>,
  setter: (digits: string) => void
) => {
  const pasted = e.clipboardData.getData("text");
  if (!pasted) return;
  e.preventDefault();
  const n = parseBRLInput(pasted);
  setter(numberToDigits(n));
};

interface Goal {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  period: string;
  start_date: string;
  end_date: string;
  target_user_id: string | null;
  created_at: string;
  status?: string;
  archived_at?: string | null;
}

interface UserOption {
  id: string;
  full_name: string;
}

const periodLabels: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
};

export default function AdminMetas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "company" | "individual">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCurrentValue, setEditCurrentValue] = useState("");
  const [editTargetValue, setEditTargetValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [targetValueDigits, setTargetValueDigits] = useState(""); // raw cents string
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [targetUserId, setTargetUserId] = useState<string>("company");

  const fetchData = async () => {
    setLoading(true);
    const [goalsRes, usersRes] = await Promise.all([
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("status", "approved").order("full_name"),
    ]);
    if (goalsRes.data) setGoals(goalsRes.data as Goal[]);
    if (usersRes.data) setUsers(usersRes.data as UserOption[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const numericTarget = currencyToNumber(targetValueDigits);
    if (numericTarget <= 0) {
      toast({ title: "Valor alvo inválido", description: "Informe um valor maior que zero.", variant: "destructive" });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Datas obrigatórias", description: "Selecione início e fim.", variant: "destructive" });
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("goals").insert({
      title,
      target_value: numericTarget,
      period,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      target_user_id: targetUserId === "company" ? null : targetUserId,
      created_by: user.id,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Meta criada!" });
      setTitle("");
      setTargetValueDigits("");
      setStartDate(undefined);
      setEndDate(undefined);
      setTargetUserId("company");
      setShowForm(false);
      await fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Meta excluída" });
      await fetchData();
    }
  };

  const startEditing = (goal: Goal) => {
    setEditingId(goal.id);
    setEditCurrentValue(numberToDigits(goal.current_value));
    setEditTargetValue(numberToDigits(goal.target_value));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditCurrentValue("");
    setEditTargetValue("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const current = currencyToNumber(editCurrentValue);
    const target = currencyToNumber(editTargetValue);
    if (target <= 0) {
      toast({ title: "Valores inválidos", description: "O valor alvo deve ser maior que zero.", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    const { error } = await supabase
      .from("goals")
      .update({ current_value: current, target_value: target })
      .eq("id", editingId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Meta atualizada!" });
      cancelEditing();
      await fetchData();
    }
    setEditSaving(false);
  };

  const filteredGoals = goals.filter((g) => {
    const archived = g.status && g.status !== "active";
    if (!showArchived && archived) return false;
    if (showArchived && !archived) return false;
    if (filter === "company") return g.target_user_id === null;
    if (filter === "individual") return g.target_user_id !== null;
    return true;
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "Empresa";
    return users.find((u) => u.id === userId)?.full_name ?? "Usuário";
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <FloatingHeader role="SDR" onRoleChange={() => {}} />

          <main className="flex-1 px-3 sm:px-4 pb-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Gestão de Metas</h2>
                <p className="text-sm text-muted-foreground">Defina metas para a empresa ou funcionários individuais</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 rounded-xl gradient-yellow-orange px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Nova Meta
              </button>
            </div>

            {/* Create Form */}
            {showForm && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <form onSubmit={handleCreate} className="glass-card p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Criar Meta</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Título</label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Receita Mensal"
                        className="h-11 rounded-xl border-border/50 bg-muted/40 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Valor Alvo</label>
                      <div className="relative">
                        <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                        <Input
                          inputMode="numeric"
                          value={formatCurrencyBRL(targetValueDigits)}
                          onChange={(e) => setTargetValueDigits(onlyDigits(e.target.value))}
                          onPaste={(e) => handleCurrencyPaste(e, setTargetValueDigits)}
                          placeholder="R$ 0,00"
                          className="h-11 rounded-xl border-border/50 bg-muted/40 pl-9 font-semibold tracking-wide focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Atribuir para</label>
                      <Select value={targetUserId} onValueChange={setTargetUserId}>
                        <SelectTrigger className="h-11 rounded-xl border-border/50 bg-muted/40 focus:border-primary focus:ring-1 focus:ring-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50 bg-popover">
                          <SelectItem value="company" className="focus:bg-primary/15 focus:text-primary">
                            <span className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-secondary" />
                              Empresa (todos)
                            </span>
                          </SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id} className="focus:bg-primary/15 focus:text-primary">
                              <span className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                {u.full_name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Período</label>
                      <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="h-11 rounded-xl border-border/50 bg-muted/40 focus:border-primary focus:ring-1 focus:ring-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50 bg-popover">
                          {[
                            { value: "monthly", label: "Mensal" },
                            { value: "quarterly", label: "Trimestral" },
                            { value: "yearly", label: "Anual" },
                          ].map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="focus:bg-primary/15 focus:text-primary">
                              <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                {opt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Início</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-11 w-full justify-between rounded-xl border-border/50 bg-muted/40 px-4 text-sm font-normal hover:bg-muted/60 hover:text-foreground",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            {startDate ? format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                            <CalendarIcon className="h-4 w-4 text-primary opacity-80" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto rounded-xl border-border/50 bg-popover p-0" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                            locale={ptBR}
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Fim</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-11 w-full justify-between rounded-xl border-border/50 bg-muted/40 px-4 text-sm font-normal hover:bg-muted/60 hover:text-foreground",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            {endDate ? format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                            <CalendarIcon className="h-4 w-4 text-primary opacity-80" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto rounded-xl border-border/50 bg-popover p-0" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            disabled={(date) => (startDate ? date < startDate : false)}
                            initialFocus
                            locale={ptBR}
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl gradient-yellow-orange px-6 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Meta"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-xl border border-border/50 px-6 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "company", "individual"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    filter === f
                      ? "gradient-yellow-orange text-primary-foreground shadow-lg"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" && <Target className="h-3.5 w-3.5" />}
                  {f === "company" && <Building2 className="h-3.5 w-3.5" />}
                  {f === "individual" && <Users className="h-3.5 w-3.5" />}
                  {f === "all" ? "Todas" : f === "company" ? "Empresa" : "Individuais"}
                </button>
              ))}
              <div className="ml-auto">
                <button
                  onClick={() => setShowArchived((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    showArchived
                      ? "bg-secondary/20 text-secondary"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {showArchived ? "Arquivadas" : "Ativas"}
                </button>
              </div>
            </div>

            {/* Goals List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGoals.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Target className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma meta encontrada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGoals.map((goal, i) => {
                  const pct = goal.target_value > 0
                    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                    : 0;
                  return (
                    <motion.div
                      key={goal.id}
                      custom={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                    >
                      <div className="glass-card p-5 group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {goal.target_user_id ? (
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20">
                                <Users className="h-4 w-4 text-primary" />
                              </div>
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/20">
                                <Building2 className="h-4 w-4 text-secondary" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-foreground">{goal.title}</p>
                              <p className="text-xs text-muted-foreground">{getUserName(goal.target_user_id)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {editingId !== goal.id && (
                              <button
                                onClick={() => startEditing(goal)}
                                className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/20 hover:text-primary"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(goal.id)}
                              className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/20 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {editingId === goal.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Valor Atual</label>
                                <input
                                  inputMode="numeric"
                                  value={formatCurrencyBRL(editCurrentValue)}
                                  onChange={(e) => setEditCurrentValue(onlyDigits(e.target.value))}
                                  onPaste={(e) => handleCurrencyPaste(e, setEditCurrentValue)}
                                  placeholder="R$ 0,00"
                                  className="w-full rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-sm font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                  autoFocus
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Valor Alvo</label>
                                <input
                                  inputMode="numeric"
                                  value={formatCurrencyBRL(editTargetValue)}
                                  onChange={(e) => setEditTargetValue(onlyDigits(e.target.value))}
                                  onPaste={(e) => handleCurrencyPaste(e, setEditTargetValue)}
                                  placeholder="R$ 0,00"
                                  className="w-full rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-sm font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleSaveEdit}
                                disabled={editSaving}
                                className="flex items-center gap-1.5 rounded-lg gradient-yellow-orange px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                              >
                                {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                Salvar
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="h-3 w-3" />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-end justify-between mb-3">
                              <p className="text-2xl font-bold text-foreground">
                               {goal.current_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                de {goal.target_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>

                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }}
                                className={`h-full rounded-full ${pct >= 100 ? "bg-success" : "gradient-yellow-orange"}`}
                              />
                            </div>

                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{periodLabels[goal.period] || goal.period}</span>
                              </div>
                              <span className="font-bold">{pct}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
