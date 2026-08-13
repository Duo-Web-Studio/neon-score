import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDeals, type DbDeal } from "@/hooks/useDeals";
import { useSections } from "@/hooks/useSections";
import { useToast } from "@/hooks/use-toast";
import type { ToastActionElement } from "@/components/ui/toast";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { NewDealDialog } from "@/components/dashboard/NewDealDialog";
import { DealDetailDialog } from "@/components/dashboard/DealDetailDialog";
import { CloseDealRoleDialog } from "@/components/dashboard/CloseDealRoleDialog";
import { DuplicateDealWarningDialog } from "@/components/dashboard/DuplicateDealWarningDialog";
import { findSuspectedDuplicates, type SuspectedDuplicate } from "@/lib/findDuplicateDeals";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Search,
  Plus,
  User,
  Building2,
  DollarSign,
  Calendar,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  X,
} from "lucide-react";

type Role = "SDR" | "Closer";

const priorityColors: Record<string, string> = {
  high: "bg-destructive/20 text-destructive",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-muted text-muted-foreground",
};

const priorityLabels: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const easeOut: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: easeOut },
  }),
};

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return `Atrasado ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
  if (diff < 1) return `Hoje ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (diff < 2) return `Amanhã ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function dateColor(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  if (d < now) return "text-destructive";
  if (d - now < 24 * 60 * 60 * 1000) return "text-yellow-400";
  return "text-muted-foreground";
}

function DealCard({
  deal,
  index,
  sectionName,
  sectionColor,
  onAdvance,
  onLose,
  onOpenDetail,
  nextStageMap,
  isOverlay = false,
}: {
  deal: DbDeal;
  index: number;
  sectionName?: string;
  sectionColor?: string;
  onAdvance: (id: string) => void;
  onLose: (id: string) => void;
  onOpenDetail: (deal: DbDeal) => void;
  nextStageMap: Record<string, string>;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { stage: deal.stage },
    disabled: isOverlay,
  });

  const canAdvance = nextStageMap[deal.stage] != null;
  const initials = (deal.responsible_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      ref={isOverlay ? undefined : setNodeRef}
      data-deal-card
      custom={index}
      initial={isOverlay ? false : "hidden"}
      whileInView={isOverlay ? undefined : "visible"}
      viewport={{ once: true }}
      variants={cardVariant}
      onClick={() => !isDragging && onOpenDetail(deal)}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      className={`glass-card p-4 transition-shadow duration-200 hover:shadow-lg hover:border-primary/40 cursor-grab active:cursor-grabbing group ${
        isDragging && !isOverlay ? "opacity-30" : ""
      } ${isOverlay ? "rotate-2 shadow-2xl ring-2 ring-primary/50" : ""}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{deal.contact_name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{deal.company_name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Responsável */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
          {initials}
        </div>
        <span className="text-xs text-muted-foreground truncate">{deal.responsible_name ?? "—"}</span>
      </div>

      {/* Section badge */}
      {sectionName && (
        <div className="flex items-center gap-2 mb-2">
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: `${sectionColor}20`, color: sectionColor }}
          >
            {sectionName}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-secondary font-bold text-sm">
          <DollarSign className="h-3.5 w-3.5" />
          R$ {Number(deal.value).toLocaleString("pt-BR")}
        </div>
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${priorityColors[deal.priority] ?? priorityColors.medium}`}>
          {priorityLabels[deal.priority] ?? deal.priority}
        </span>
      </div>

      {/* Datas importantes */}
      {(deal.next_action_at || deal.meeting_at) && (
        <div className="flex flex-wrap gap-2 mb-2 text-[10px]">
          {deal.next_action_at && (
            <span className={`flex items-center gap-1 ${dateColor(deal.next_action_at)}`}>
              <CalendarClock className="h-3 w-3" />
              {formatShortDate(deal.next_action_at)}
            </span>
          )}
          {deal.meeting_at && (
            <span className={`flex items-center gap-1 ${dateColor(deal.meeting_at)}`}>
              <CalendarDays className="h-3 w-3" />
              Reunião {formatShortDate(deal.meeting_at)}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mb-3">
        <Calendar className="h-3 w-3" />
        Criado em {new Date(deal.created_at).toLocaleDateString("pt-BR")}
      </div>

      {/* Botões de ação */}
      {nextStageMap[deal.stage] === "fechado_ganho" ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(deal.id);
            }}
            className="flex items-center justify-center gap-1 rounded-lg bg-success/15 hover:bg-success/25 text-success text-xs font-medium py-2 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Concluído
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onLose(deal.id);
            }}
            className="flex items-center justify-center gap-1 rounded-lg bg-destructive/15 hover:bg-destructive/25 text-destructive text-xs font-medium py-2 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Perdido
          </button>
        </div>
      ) : canAdvance ? (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onAdvance(deal.id);
          }}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium py-2 transition-all hover:gap-2"
        >
          Próxima etapa
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </motion.div>
  );
}

function KanbanColumn({
  stage,
  deals,
  colIndex,
  sections,
  onAdvance,
  onLose,
  onAddClick,
  onOpenDetail,
  nextStageMap,
}: {
  stage: { id: string; title: string; color: string };
  deals: DbDeal[];
  colIndex: number;
  sections: { id: string; name: string; color: string }[];
  onAdvance: (id: string) => void;
  onLose: (id: string) => void;
  onAddClick: (stageId: string) => void;
  onOpenDetail: (deal: DbDeal) => void;
  nextStageMap: Record<string, string>;
}) {
  const totalValue = deals.reduce((sum, d) => sum + Number(d.value), 0);
  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: colIndex * 0.06, duration: 0.4, ease: easeOut }}
      data-kanban-column
      className="flex flex-col min-w-[80vw] sm:min-w-[260px] flex-1 snap-start"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-xs font-semibold text-foreground">{stage.title}</h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
            {deals.length}
          </span>
        </div>
        <button
          onClick={() => onAddClick(stage.id)}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 rounded-xl bg-muted/30 px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">Total: </span>
        <span className="font-bold text-foreground">R$ {totalValue.toLocaleString("pt-BR")}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-3 flex-1 rounded-2xl p-2 -m-2 transition-colors ${
          isOver ? "bg-primary/10 ring-2 ring-primary/40" : ""
        }`}
      >
        {deals.map((deal, i) => {
          const sec = deal.section_id ? sectionMap.get(deal.section_id) : undefined;
          return (
            <DealCard
              key={deal.id}
              deal={deal}
              index={i + colIndex * 3}
              sectionName={sec?.name}
              sectionColor={sec?.color}
              onAdvance={onAdvance}
              onLose={onLose}
              onOpenDetail={onOpenDetail}
              nextStageMap={nextStageMap}
            />
          );
        })}
        <button
          onClick={() => onAddClick(stage.id)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border/50 py-4 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar lead
        </button>
      </div>
    </motion.div>
  );
}

const Pipeline = () => {
  const { roles, user } = useAuth();
  const { sections } = useSections();
  const { stages, nextStageMap } = usePipelineStages();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const { deals, loading, updateDeal } = useDeals({ sectionId: selectedSection });
  const { toast } = useToast();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");

  const [role, setRole] = useState<Role>("SDR");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStage, setDialogStage] = useState(stages[0]?.id ?? "lead");
  const [detailDeal, setDetailDeal] = useState<DbDeal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [pendingClose, setPendingClose] = useState<{ dealId: string; targetStage: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicates: SuspectedDuplicate[];
    proceed: () => void;
  } | null>(null);
  const hasBothRoles = roles.includes("sdr") && roles.includes("closer");
  const boardRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const updateScrollState = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, loading]);

  const scrollByColumn = (dir: 1 | -1) => {
    const el = boardRef.current;
    if (!el) return;
    // ~ width of one column + gap
    const firstCol = el.querySelector<HTMLElement>("[data-kanban-column]");
    const step = firstCol ? firstCol.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  // Drag-to-scroll (mouse) on the board background — ignore when starting on a card
  const dragState = useRef<{ active: boolean; startX: number; startScroll: number }>({
    active: false,
    startX: 0,
    startScroll: 0,
  });

  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-deal-card]") || target.closest("button")) return;
    const el = boardRef.current;
    if (!el) return;
    dragState.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const el = boardRef.current;
    if (!el) return;
    el.scrollLeft = dragState.current.startScroll - (e.clientX - dragState.current.startX);
  };

  const handleBoardPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    const el = boardRef.current;
    if (el) {
      el.style.cursor = "";
      try { el.releasePointerCapture(e.pointerId); } catch { /* ponteiro já liberado */ }
    }
  };


  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const doMove = async (
    dealId: string,
    targetStage: string,
    closedByRole?: "sdr" | "closer",
  ) => {
    const updates: { stage: string; closed_by_role?: "sdr" | "closer" } = { stage: targetStage };
    if (closedByRole) updates.closed_by_role = closedByRole;
    const { error } = await updateDeal(dealId, updates);
    if (error) {
      toast({ title: "Erro ao mover", description: error, variant: "destructive" });
      return;
    }
    if (targetStage === "fechado_ganho") {
      toast({
        title: "🎉 Convertido em cliente!",
        description: "Veja em Clientes",
        action: (
          <button onClick={() => navigate("/clientes")} className="text-xs font-medium text-primary hover:underline">
            Abrir
          </button>
        ) as unknown as ToastActionElement,
      });
    } else {
      toast({ title: "Lead movido!" });
    }
  };

  const performMove = async (
    dealId: string,
    targetStage: string,
    closedByRole?: "sdr" | "closer",
  ) => {
    // Checagem de duplicata só ao fechar como ganho
    if (targetStage === "fechado_ganho") {
      const deal = deals.find((d) => d.id === dealId);
      if (deal && Number(deal.value) > 0) {
        const dups = await findSuspectedDuplicates({
          client_id: deal.client_id,
          company_name: deal.company_name,
          value: Number(deal.value),
          excludeId: deal.id,
        });
        if (dups.length > 0) {
          setDuplicateWarning({
            duplicates: dups,
            proceed: () => doMove(dealId, targetStage, closedByRole),
          });
          return;
        }
      }
    }
    await doMove(dealId, targetStage, closedByRole);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;
    const dealId = String(active.id);
    const targetStage = String(over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === targetStage) return;
    const isOwnCard = !!user && deal.user_id === user.id;
    if (targetStage === "fechado_ganho" && hasBothRoles && isOwnCard) {
      setPendingClose({ dealId, targetStage });
      return;
    }
    await performMove(dealId, targetStage);
  };

  const handleLose = async (id: string) => {
    const { error } = await updateDeal(id, { stage: "fechado_perdido" });
    if (error) {
      toast({ title: "Erro", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Lead marcado como perdido" });
  };

  const filteredBySearch = useMemo(
    () =>
      deals.filter(
        (d) =>
          !search ||
          d.contact_name.toLowerCase().includes(search.toLowerCase()) ||
          d.company_name.toLowerCase().includes(search.toLowerCase()) ||
          (d.responsible_name ?? "").toLowerCase().includes(search.toLowerCase()),
      ),
    [deals, search],
  );

  const handleAdvance = async (id: string) => {
    const deal = deals.find((d) => d.id === id);
    if (!deal) return;
    const next = nextStageMap[deal.stage];
    if (!next) return;
    const isOwnCard = !!user && deal.user_id === user.id;
    if (next === "fechado_ganho" && hasBothRoles && isOwnCard) {
      setPendingClose({ dealId: id, targetStage: next });
      return;
    }
    await performMove(id, next);
  };

  const handleAddClick = (stageId: string) => {
    setDialogStage(stageId);
    setDialogOpen(true);
  };

  const handleOpenDetail = (deal: DbDeal) => {
    setDetailDeal(deal);
    setDetailOpen(true);
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
              className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Pipeline de Vendas</h2>
                <p className="text-sm text-muted-foreground">
                  Leads em andamento — clique em qualquer card para ver detalhes
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar lead..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full sm:w-auto rounded-xl border border-border/50 bg-muted/40 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
                <button
                  onClick={() => { setDialogStage(stages[0]?.id ?? "lead"); setDialogOpen(true); }}
                  className="flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm font-medium text-primary-foreground gradient-yellow-orange transition-transform hover:scale-105 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo Lead</span>
                </button>
              </div>
            </motion.div>

            {/* Section filter */}
            <div className="no-scrollbar mb-4 flex items-center gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedSection(null)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-medium transition-all duration-300 ${
                  selectedSection === null
                    ? "gradient-yellow-orange text-primary-foreground shadow-lg"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas
              </button>
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSection(sec.id)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-medium transition-all duration-300 ${
                    selectedSection === sec.id
                      ? "text-primary-foreground shadow-lg"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                  style={selectedSection === sec.id ? { background: sec.color } : undefined}
                >
                  <span className="flex items-center gap-1.5">
                    {selectedSection !== sec.id && (
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sec.color }} />
                    )}
                    {sec.name}
                  </span>
                </button>
              ))}
            </div>

            <NewDealDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              defaultStage={dialogStage}
              defaultSectionId={selectedSection}
            />

            <DealDetailDialog
              deal={detailDeal}
              open={detailOpen}
              onOpenChange={setDetailOpen}
            />

            <CloseDealRoleDialog
              open={pendingClose !== null}
              onOpenChange={(o) => { if (!o) setPendingClose(null); }}
              onSelect={async (role) => {
                if (!pendingClose) return;
                const p = pendingClose;
                setPendingClose(null);
                await performMove(p.dealId, p.targetStage, role);
              }}
            />

            <DuplicateDealWarningDialog
              open={duplicateWarning !== null}
              onOpenChange={(o) => { if (!o) setDuplicateWarning(null); }}
              duplicates={duplicateWarning?.duplicates ?? []}
              onConfirmNew={async () => {
                const w = duplicateWarning;
                setDuplicateWarning(null);
                await w?.proceed();
              }}
              onCancel={() => setDuplicateWarning(null)}
            />

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="relative">
                  <div
                    ref={boardRef}
                    onPointerDown={handleBoardPointerDown}
                    onPointerMove={handleBoardPointerMove}
                    onPointerUp={handleBoardPointerEnd}
                    onPointerCancel={handleBoardPointerEnd}
                    className="kanban-scroll flex gap-4 overflow-x-auto overflow-y-hidden pb-3 snap-x snap-mandatory sm:snap-none cursor-grab"
                  >
                    {stages.map((stage, i) => (
                      <KanbanColumn
                        key={stage.id}
                        stage={stage}
                        deals={filteredBySearch.filter((d) => d.stage === stage.id)}
                        colIndex={i}
                        sections={sections}
                        onAdvance={handleAdvance}
                        onLose={handleLose}
                        onAddClick={handleAddClick}
                        onOpenDetail={handleOpenDetail}
                        nextStageMap={nextStageMap}
                      />
                    ))}
                  </div>

                  {/* Floating navigation arrows */}
                  {canScrollLeft && (
                    <button
                      type="button"
                      aria-label="Coluna anterior"
                      onClick={() => scrollByColumn(-1)}
                      className="absolute left-2 top-1/2 z-20 -translate-y-1/2 hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/90 text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:border-primary/60 hover:text-primary glow-yellow"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                  {canScrollRight && (
                    <button
                      type="button"
                      aria-label="Próxima coluna"
                      onClick={() => scrollByColumn(1)}
                      className="absolute right-2 top-1/2 z-20 -translate-y-1/2 hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/90 text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:border-primary/60 hover:text-primary glow-yellow"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <DragOverlay>
                  {activeDragId && (() => {
                    const d = deals.find((x) => x.id === activeDragId);
                    if (!d) return null;
                    const sec = d.section_id ? sections.find((s) => s.id === d.section_id) : undefined;
                    return (
                      <DealCard
                        deal={d}
                        index={0}
                        sectionName={sec?.name}
                        sectionColor={sec?.color}
                        onAdvance={() => {}}
                        onLose={() => {}}
                        onOpenDetail={() => {}}
                        nextStageMap={nextStageMap}
                        isOverlay
                      />
                    );
                  })()}
                </DragOverlay>
              </DndContext>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Pipeline;
