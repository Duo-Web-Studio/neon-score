import { type FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, GripVertical, Layers, Loader2, Pencil, Plus, Route, Save, Trash2, UserCog, X, Search, Briefcase, type LucideIcon } from "lucide-react";
import { DeleteDealsManager } from "@/components/dashboard/DeleteDealsManager";
import { closestCenter, DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSearchParams } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { useAuth } from "@/hooks/useAuth";
import { useSections } from "@/hooks/useSections";
import { useToast } from "@/hooks/use-toast";
import { usePipelineStages, type DbPipelineStage } from "@/hooks/usePipelineStages";
import { useDeals } from "@/hooks/useDeals";
import { useApprovedUsers } from "@/hooks/useApprovedUsers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRESET_COLORS = [
  "#FFD600", "#FF8F00", "#F57C00", "#4CAF50", "#2196F3",
  "#9C27B0", "#E91E63", "#00BCD4", "#FF5722", "#607D8B",
];

type OrganizationTab = "secoes" | "pipeline" | "reatribuir" | "vendas";

function ColorPicker({ value, onChange, size = "md" }: { value: string; onChange: (color: string) => void; size?: "sm" | "md" }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`${size === "sm" ? "h-5 w-5" : "h-6 w-6"} rounded-full border-2 transition-transform ${value === color ? "scale-110 border-foreground" : "border-transparent"}`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function SectionsManager({ isAdmin }: { isAdmin: boolean }) {
  const { sections, loading, createSection, updateSection, deleteSection } = useSections();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    const { error } = await createSection({ name: formName.trim(), color: formColor });
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Seção criada" });
    setFormName("");
    setFormColor(PRESET_COLORS[0]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await updateSection(id, { name: editName.trim(), color: editColor });
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Seção atualizada" });
    setEditId(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteSection(id);
    if (error) toast({ title: "Erro", description: error, variant: "destructive" });
    else toast({ title: "Seção excluída" });
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Layers className="h-5 w-5 text-primary" />
            Seções
          </h3>
          <p className="text-sm text-muted-foreground">Segmentos usados para organizar oportunidades por mercado ou operação.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground gradient-yellow-orange transition-transform hover:scale-105 active:scale-95">
            <Plus className="h-4 w-4" />
            Nova seção
          </button>
        )}
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreate} className="glass-card p-5 space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Criar seção</h4>
          <div className="flex flex-col gap-3 lg:flex-row">
            <input value={formName} onChange={(event) => setFormName(event.target.value)} placeholder="Ex: Saúde, SaaS, Educação" className="flex-1 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
            <ColorPicker value={formColor} onChange={setFormColor} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-xl gradient-yellow-orange px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Criar"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border/50 px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">Cancelar</button>
          </div>
        </motion.form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="glass-card h-20 animate-pulse" />)}</div>
      ) : sections.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-1 font-semibold text-foreground">Nenhuma seção criada</p>
          <p className="text-sm text-muted-foreground">Crie seções para organizar o pipeline por segmentos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section, index) => (
            <motion.div key={section.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="glass-card group flex items-center justify-between gap-4 p-4">
              {editId === section.id ? (
                <div className="flex-1 space-y-3">
                  <input value={editName} onChange={(event) => setEditName(event.target.value)} className="w-full rounded-lg border border-border/50 bg-muted/40 px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none" />
                  <ColorPicker value={editColor} onChange={setEditColor} size="sm" />
                  <div className="flex gap-1.5">
                    <button onClick={() => handleUpdate(section.id)} className="rounded-lg bg-success/20 p-1.5 text-success transition-colors hover:bg-success/30"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setEditId(null)} className="rounded-lg bg-muted p-1.5 text-muted-foreground transition-colors hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: section.color }} />
                    <span className="truncate text-sm font-semibold text-foreground">{section.name}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => { setEditId(section.id); setEditName(section.name); setEditColor(section.color); }} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/20 hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(section.id)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function SortableStageCard({ stage, children, disabled }: { stage: DbPipelineStage; children: (dragHandle: React.ReactNode) => React.ReactNode; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id, disabled });
  return (
    <motion.div ref={setNodeRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: isDragging ? 0.25 : 1, y: 0 }} transition={{ duration: 0.18 }} className={`glass-card p-4 transition-shadow ${isDragging ? "border-primary/40" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition: transition ?? "transform 180ms ease" }}>
      {children(disabled ? null : (
        <button type="button" className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-primary cursor-grab active:cursor-grabbing" aria-label={`Reordenar ${stage.title}`} {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
          <span className="hidden sm:inline">Arrastar</span>
        </button>
      ))}
    </motion.div>
  );
}

function StageDragPreview({ stage, position }: { stage: DbPipelineStage; position: number }) {
  return (
    <div className="glass-card w-[min(56rem,calc(100vw-2rem))] border-primary/70 p-4 glow-yellow shadow-2xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">{position}</div>
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-3">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="truncate text-sm font-semibold text-foreground">{stage.title}</span>
              {stage.is_final && <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Final</span>}
            </div>
            <p className="text-xs text-muted-foreground">Chave interna: {stage.key}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          <GripVertical className="h-4 w-4" />
          Movendo
        </div>
      </div>
    </div>
  );
}

function PipelineStagesManager({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const { dbStages, loading, createStage, updateStage, reorderStages } = usePipelineStages();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [orderedStages, setOrderedStages] = useState<DbPipelineStage[]>([]);
  const visibleStages = orderedStages;
  const activeDragStage = visibleStages.find((stage) => stage.id === activeDragId) ?? null;

  useEffect(() => {
    if (activeDragId || savingOrder) return;
    setOrderedStages(dbStages.filter((stage) => stage.is_active).sort((a, b) => a.sort_order - b.sort_order));
  }, [activeDragId, dbStages, savingOrder]);

  const resetOrder = () => setOrderedStages(dbStages.filter((stage) => stage.is_active).sort((a, b) => a.sort_order - b.sort_order));

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!formTitle.trim()) return;
    setSaving(true);
    const { error } = await createStage(formTitle, formColor);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao criar etapa", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Etapa criada" });
    setFormTitle("");
    setFormColor(PRESET_COLORS[0]);
    setShowForm(false);
  };

  const handleUpdate = async (stage: DbPipelineStage) => {
    if (!editTitle.trim()) return;
    const { error } = await updateStage(stage.id, { title: editTitle.trim(), color: editColor });
    if (error) {
      toast({ title: "Erro ao atualizar", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Etapa atualizada" });
    setEditId(null);
  };

  const handleDeactivate = async (stage: DbPipelineStage) => {
    if (stage.is_final) return;
    const { error } = await updateStage(stage.id, { is_active: false });
    if (error) toast({ title: "Erro ao desativar", description: error, variant: "destructive" });
    else toast({ title: "Etapa desativada" });
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return;
    setOrderedStages((current) => {
      const oldIndex = current.findIndex((stage) => stage.id === active.id);
      const newIndex = current.findIndex((stage) => stage.id === over.id);
      if (current[newIndex]?.is_final || oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveDragId(null);
    const overStage = visibleStages.find((stage) => stage.id === over?.id);
    if (!over || overStage?.is_final) {
      resetOrder();
      return;
    }
    if (visibleStages.findIndex((stage) => stage.id === active.id) < 0 || visibleStages.findIndex((stage) => stage.id === over.id) < 0) return;
    const editableIds = visibleStages.filter((stage) => !stage.is_final).map((stage) => stage.id);
    setSavingOrder(true);
    const { error } = await reorderStages(editableIds);
    setSavingOrder(false);
    if (error) toast({ title: "Erro ao ordenar", description: error, variant: "destructive" });
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Route className="h-5 w-5 text-primary" />
            Etapas do Pipeline
          </h3>
          <p className="text-sm text-muted-foreground">Caminhos do funil: edite os nomes e arraste para reorganizar a ordem.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground gradient-yellow-orange transition-transform hover:scale-105 active:scale-95">
            <Plus className="h-4 w-4" />
            Nova etapa
          </button>
        )}
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreate} className="glass-card p-5 space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Criar etapa</h4>
          <div className="flex flex-col gap-3 lg:flex-row">
            <input value={formTitle} onChange={(event) => setFormTitle(event.target.value)} placeholder="Ex: Lead em progresso" className="flex-1 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
            <ColorPicker value={formColor} onChange={setFormColor} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-xl gradient-yellow-orange px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Criar etapa"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border/50 px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">Cancelar</button>
          </div>
        </motion.form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="glass-card h-24 animate-pulse" />)}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({ active }: DragStartEvent) => setActiveDragId(String(active.id))} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={() => { setActiveDragId(null); resetOrder(); }}>
          <SortableContext items={visibleStages.map((stage) => stage.id)} strategy={verticalListSortingStrategy}>
            <div className="mx-auto flex max-w-4xl flex-col gap-3">
              {savingOrder && <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"><Save className="h-3.5 w-3.5" />Salvando nova ordem...</div>}
              {visibleStages.map((stage) => (
                <SortableStageCard key={stage.id} stage={stage} disabled={!isAdmin || stage.is_final || editId === stage.id}>
                  {(dragHandle) => editId === stage.id ? (
                    <div className="space-y-3">
                      <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="w-full rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                      <ColorPicker value={editColor} onChange={setEditColor} size="sm" />
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate(stage)} className="rounded-lg bg-success/20 p-2 text-success transition-colors hover:bg-success/30"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditId(null)} className="rounded-lg bg-muted p-2 text-muted-foreground transition-colors hover:text-foreground"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-xs font-semibold text-muted-foreground">{visibleStages.findIndex((item) => item.id === stage.id) + 1}</div>
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-3">
                            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: stage.color }} />
                            <span className="truncate text-sm font-semibold text-foreground">{stage.title}</span>
                            {stage.is_final && <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Final</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">Chave interna: {stage.key}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex shrink-0 items-center gap-1">
                          {dragHandle}
                          <button onClick={() => { setEditId(stage.id); setEditTitle(stage.title); setEditColor(stage.color); }} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/20 hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                          {!stage.is_final && <button onClick={() => handleDeactivate(stage)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"><X className="h-3.5 w-3.5" /></button>}
                        </div>
                      )}
                    </div>
                  )}
                </SortableStageCard>
              ))}
            </div>
          </SortableContext>
          <DragOverlay adjustScale={false} dropAnimation={{ duration: 180, easing: "ease" }}>
            {activeDragStage ? <StageDragPreview stage={activeDragStage} position={visibleStages.findIndex((stage) => stage.id === activeDragStage.id) + 1} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </section>
  );
}

function ReassignDealsManager() {
  const { deals, loading, updateDeal } = useDeals();
  const { users: approvedUsers } = useApprovedUsers();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { user_id: string; closed_by_user_id: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const closedDeals = useMemo(() => {
    const term = search.trim().toLowerCase();
    return deals
      .filter((d) => d.stage === "fechado_ganho")
      .filter((d) => {
        if (!term) return true;
        return (
          d.company_name.toLowerCase().includes(term) ||
          d.contact_name.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const ad = a.closed_at ? new Date(a.closed_at).getTime() : 0;
        const bd = b.closed_at ? new Date(b.closed_at).getTime() : 0;
        return bd - ad;
      });
  }, [deals, search]);

  const getDraft = (deal: typeof deals[number]) => {
    return (
      drafts[deal.id] ?? {
        user_id: deal.user_id,
        closed_by_user_id: deal.closed_by_user_id ?? deal.user_id,
      }
    );
  };

  const setDraft = (id: string, patch: Partial<{ user_id: string; closed_by_user_id: string }>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { user_id: "", closed_by_user_id: "" }), ...patch },
    }));
  };

  const isDirty = (deal: typeof deals[number]) => {
    const d = getDraft(deal);
    return (
      d.user_id !== deal.user_id ||
      d.closed_by_user_id !== (deal.closed_by_user_id ?? deal.user_id)
    );
  };

  const handleSave = async (deal: typeof deals[number]) => {
    const d = getDraft(deal);
    setSavingId(deal.id);
    const { error } = await updateDeal(deal.id, {
      user_id: d.user_id,
      closed_by_user_id: d.closed_by_user_id,
    });
    setSavingId(null);
    if (error) {
      toast({ title: "Erro ao reatribuir", description: error, variant: "destructive" });
      return;
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[deal.id];
      return next;
    });
    toast({ title: "Venda reatribuída" });
  };

  return (
    <section className="space-y-5">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <UserCog className="h-5 w-5 text-primary" />
          Reatribuir Vendas
        </h3>
        <p className="text-sm text-muted-foreground">
          Corrija o vendedor responsável e quem fechou cada venda já concluída. Útil quando alguém marcou no card errado.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por empresa ou contato..."
          className="w-full rounded-xl border border-border/50 bg-muted/40 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="glass-card h-24 animate-pulse" />)}
        </div>
      ) : closedDeals.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <UserCog className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-1 font-semibold text-foreground">Nenhuma venda fechada encontrada</p>
          <p className="text-sm text-muted-foreground">Quando houver vendas fechadas, elas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {closedDeals.map((deal) => {
            const draft = getDraft(deal);
            const dirty = isDirty(deal);
            return (
              <div key={deal.id} className="glass-card p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{deal.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {deal.contact_name}
                      {" · "}
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(deal.value || 0)}
                      {deal.closed_at && (
                        <> {" · "} Fechada em {format(new Date(deal.closed_at), "dd 'de' MMM yyyy", { locale: ptBR })}</>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSave(deal)}
                    disabled={!dirty || savingId === deal.id}
                    className="flex items-center gap-2 rounded-xl gradient-yellow-orange px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingId === deal.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Salvar
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Responsável</label>
                    <Select value={draft.user_id} onValueChange={(v) => setDraft(deal.id, { user_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {approvedUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Quem fechou</label>
                    <Select value={draft.closed_by_user_id} onValueChange={(v) => setDraft(deal.id, { closed_by_user_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {approvedUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function AdminOrganizacao() {
  const { roles } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = roles.includes("admin");
  const tabParam = searchParams.get("tab");
  const activeTab: OrganizationTab =
    tabParam === "pipeline"
      ? "pipeline"
      : tabParam === "reatribuir"
        ? "reatribuir"
        : tabParam === "vendas"
          ? "vendas"
          : "secoes";

  const tabs = useMemo(() => {
    const base: Array<{ id: OrganizationTab; label: string; icon: LucideIcon; description: string }> = [
      { id: "secoes", label: "Seções", icon: Layers, description: "Segmentos" },
      { id: "pipeline", label: "Etapas do Pipeline", icon: Route, description: "Ordem do funil" },
    ];
    if (isAdmin) {
      base.push({ id: "reatribuir", label: "Reatribuir Vendas", icon: UserCog, description: "Corrigir vendedor" });
      base.push({ id: "vendas", label: "Excluir Vendas", icon: Briefcase, description: "Remover registros" });
    }
    return base;
  }, [isAdmin]);

  const setActiveTab = (tab: OrganizationTab) => setSearchParams({ tab });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <FloatingHeader role="SDR" onRoleChange={() => {}} />
          <main className="flex-1 px-3 pb-8 sm:px-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">Organização do Pipeline</h2>
                <p className="text-sm text-muted-foreground">Centralize as estruturas que definem como o funil é exibido e segmentado.</p>
              </div>
              <div className="flex items-center gap-6 border-b border-border/40 sm:border-b-0">
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative pb-2 text-sm font-medium transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {tab.label}
                      {active && (
                        <motion.span
                          layoutId="org-tab-underline"
                          className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-primary"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {activeTab === "secoes" ? (
                <SectionsManager isAdmin={isAdmin} />
              ) : activeTab === "pipeline" ? (
                <PipelineStagesManager isAdmin={isAdmin} />
              ) : activeTab === "reatribuir" ? (
                <ReassignDealsManager />
              ) : (
                <DeleteDealsManager />
              )}
            </motion.div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
