import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { supabase } from "@/integrations/supabase/client";
import { useDeals } from "@/hooks/useDeals";
import { useCommissionRates } from "@/hooks/useCommissionRates";
import { SellerHistoryDialog } from "@/components/dashboard/SellerHistoryDialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Search,
  Target,
  DollarSign,
  Users,
  ChevronRight,
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";

type Role = "SDR" | "Closer";

const easeOut: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: easeOut },
  }),
};

const avatarGradients = [
  "gradient-yellow-orange",
  "gradient-orange-strong",
  "bg-primary/30",
  "bg-secondary/30",
  "bg-accent/30",
  "bg-success/30",
];

const tooltipStyle = {
  backgroundColor: "hsl(0, 0%, 8%)",
  border: "1px solid hsl(0, 0%, 16%)",
  borderRadius: "12px",
  color: "hsl(0, 0%, 100%)",
};

const PAGE_SIZE = 6;

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(totalItems, page * pageSize);
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground">{from}–{to}</span> de{" "}
        <span className="font-semibold text-foreground">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-1.5 text-xs text-muted-foreground">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`h-9 min-w-9 rounded-xl px-3 text-xs font-bold transition-all ${
                p === page
                  ? "gradient-yellow-orange text-primary-foreground shadow-lg"
                  : "border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// (mock MemberCard removed)

// ── Admin team member from DB ──
interface DbTeamMember {
  id: string;
  full_name: string;
  created_at: string | null;
  roles: string[];
}

interface MemberStats {
  confirmadas: number;
  perdidas: number;
  recuperadas: number;
  receita: number;
  comissao: number;
  receitaHoje: number;
  receitaMes: number;
  receitaTotal: number;
  vendasHoje: number;
  vendasMes: number;
  vendasTotal: number;
}

function AdminMemberCard({
  member,
  stats,
  index,
  onOpen,
  scope,
}: {
  member: DbTeamMember;
  stats: MemberStats;
  index: number;
  onOpen: () => void;
  scope: "month" | "all";
}) {
  const scopeLabel = scope === "month" ? "mês" : "total";

  const initials = member.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div custom={index} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
      <button
        type="button"
        onClick={onOpen}
        className="glass-card p-5 transition-all duration-300 hover:-translate-y-0.5 text-left w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-primary-foreground ${avatarGradients[index % avatarGradients.length]}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{member.full_name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {member.roles.map((r) => (
                <span key={r} className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${r === "sdr" ? "bg-primary/15 text-primary" : r === "closer" ? "bg-secondary/15 text-secondary" : "bg-accent/15 text-accent"}`}>
                  {r.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Receita por período */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl bg-muted/30 p-2.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Hoje</div>
            <span className="text-sm font-bold text-primary">{fmt(stats.receitaHoje)}</span>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stats.vendasHoje} venda{stats.vendasHoje === 1 ? "" : "s"}</div>
          </div>
          <div className="rounded-xl bg-muted/30 p-2.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Mês</div>
            <span className="text-sm font-bold text-secondary">{fmt(stats.receitaMes)}</span>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stats.vendasMes} venda{stats.vendasMes === 1 ? "" : "s"}</div>
          </div>
          <div className="rounded-xl bg-muted/30 p-2.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {scope === "month" ? "Total do mês" : "Total geral"}
            </div>
            <span className="text-sm font-bold text-foreground">
              {fmt(scope === "month" ? stats.receitaMes : stats.receitaTotal)}
            </span>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {scope === "month" ? stats.vendasMes : stats.vendasTotal} venda
              {(scope === "month" ? stats.vendasMes : stats.vendasTotal) === 1 ? "" : "s"}
            </div>
          </div>

        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl bg-muted/30 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <CheckCircle2 className="h-3 w-3 text-success" /> Confirmadas ({scopeLabel})
            </div>
            <span className="text-sm font-bold text-foreground">{stats.confirmadas}</span>
          </div>
          <div className="rounded-xl bg-muted/30 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <XCircle className="h-3 w-3 text-destructive" /> Sem Conversão ({scopeLabel})
            </div>
            <span className="text-sm font-bold text-foreground">{stats.perdidas}</span>
          </div>
          <div className="rounded-xl bg-muted/30 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <RefreshCw className="h-3 w-3 text-accent" /> Recuperadas ({scopeLabel})
            </div>
            <span className="text-sm font-bold text-foreground">{stats.recuperadas}</span>
          </div>

          <div className="rounded-xl bg-muted/30 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3 text-secondary" /> Comissão ({scopeLabel})

            </div>
            <span className="text-sm font-bold text-secondary">
              {stats.comissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-3 border-t border-border/30">
          <Calendar className="h-3 w-3" />
          <span>Desde {member.created_at ? new Date(member.created_at).toLocaleDateString("pt-BR") : "—"}</span>
          <span className="ml-auto text-primary font-medium">Ver histórico →</span>
        </div>
      </button>
    </motion.div>
  );
}

// ── Admin View ──
function AdminEquipeView() {
  const [members, setMembers] = useState<DbTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "sdr" | "closer">("all");
  const [scope, setScope] = useState<"month" | "all">("month");
  const [selected, setSelected] = useState<{ member: DbTeamMember; index: number } | null>(null);
  const [page, setPage] = useState(1);
  const { deals } = useDeals({ includeClosed: true });
  const { getRate } = useCommissionRates();


  useEffect(() => {
    const fetchTeam = async () => {
      setLoading(true);
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, created_at").eq("status", "approved"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const roleMap = new Map<string, string[]>();
      rolesRes.data?.forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });

      const members: DbTeamMember[] = (profilesRes.data ?? [])
        .map((p) => ({
          id: p.id,
          full_name: p.full_name,
          created_at: p.created_at,
          roles: roleMap.get(p.id) ?? [],
        }));

      setMembers(members);
      setLoading(false);
    };
    fetchTeam();
  }, []);

  const statsByMember = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);
    const map = new Map<string, MemberStats>();
    members.forEach((m) => {
      map.set(m.id, {
        confirmadas: 0,
        perdidas: 0,
        recuperadas: 0,
        receita: 0,
        comissao: 0,
        receitaHoje: 0,
        receitaMes: 0,
        receitaTotal: 0,
        vendasHoje: 0,
        vendasMes: 0,
        vendasTotal: 0,
      });
    });
    deals.forEach((d) => {
      const sellerId = d.closed_by_user_id ?? d.user_id;
      if (!sellerId) return;
      const s = map.get(sellerId);
      if (!s) return;
      const closedStr = d.closed_at ? String(d.closed_at) : "";
      const closedThisMonth = closedStr.startsWith(monthStr);

      if (d.stage === "fechado_ganho") {
        const v = Number(d.value);
        s.receitaTotal += v;
        s.vendasTotal += 1;
        if (closedStr.startsWith(todayStr)) {
          s.receitaHoje += v;
          s.vendasHoje += 1;
        }
        if (closedThisMonth) {
          s.receitaMes += v;
          s.vendasMes += 1;
        }
        // Escopo dinâmico: mês vs total
        if (scope === "all" || closedThisMonth) {
          s.confirmadas += 1;
          s.receita += v;
          if (d.recovered_at) s.recuperadas += 1;
        }
      } else if (d.stage === "fechado_perdido") {
        if (scope === "all" || closedThisMonth) s.perdidas += 1;
      }
    });

    map.forEach((s, memberId) => {
      const member = members.find((m) => m.id === memberId);
      const rate = getRate(memberId, member?.roles ?? []);
      const base = scope === "all" ? s.receitaTotal : s.receitaMes;
      s.comissao = Math.round(base * rate) / 100;

    });
    return map;
  }, [members, deals, getRate, scope]);

  const filtered = useMemo(() =>
    members.filter((m) => {
      const matchSearch = !search || m.full_name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || m.roles.includes(filter);
      return matchSearch && matchFilter;
    }),
    [members, search, filter]
  );

  useEffect(() => { setPage(1); }, [search, filter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  const totals = useMemo(() => {
    let confirmadas = 0, perdidas = 0, recuperadas = 0, comissao = 0;
    statsByMember.forEach((s) => {
      confirmadas += s.confirmadas;
      perdidas += s.perdidas;
      recuperadas += s.recuperadas;
      comissao += s.comissao;
    });
    return { confirmadas, perdidas, recuperadas, comissao };
  }, [statsByMember]);

  return (
    <main className="flex-1 px-4 pb-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Equipe</h2>
        <p className="text-sm text-muted-foreground">Gerencie os membros do seu time comercial</p>
      </motion.div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Membros", value: String(members.length), icon: Users, color: "bg-primary/15 text-primary" },
          { label: `Confirmadas (${scope === "month" ? "mês" : "total"})`, value: String(totals.confirmadas), icon: CheckCircle2, color: "bg-success/15 text-success" },
          { label: `Sem Conversão (${scope === "month" ? "mês" : "total"})`, value: String(totals.perdidas), icon: XCircle, color: "bg-destructive/15 text-destructive" },
          { label: `Recuperadas (${scope === "month" ? "mês" : "total"})`, value: String(totals.recuperadas), icon: RefreshCw, color: "bg-accent/15 text-accent" },


        ].map((s, i) => (
          <motion.div key={s.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <div className="glass-card p-5 flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "sdr", "closer"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-xs font-medium transition-all duration-300 ${
                filter === f
                  ? "gradient-yellow-orange text-primary-foreground shadow-lg"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Todos" : f.toUpperCase()}
            </button>
          ))}
          <div className="ml-2 flex items-center gap-0.5 rounded-xl bg-muted/40 p-0.5">
            {(["month", "all"] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setScope(sc)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  scope === sc
                    ? "bg-foreground/10 text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {sc === "month" ? "Mês atual" : "Todos os meses"}
              </button>
            ))}
          </div>

        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar membro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-xl border border-border/50 bg-muted/40 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>
      </div>

      {/* Members */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-semibold mb-1">Nenhum membro encontrado</p>
          <p className="text-sm text-muted-foreground">Aprove usuários no painel administrativo para vê-los aqui.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((member, i) => (
              <AdminMemberCard
                key={member.id}
                member={member}
                stats={
                  statsByMember.get(member.id) ?? {
                    confirmadas: 0,
                    perdidas: 0,
                    recuperadas: 0,
                    receita: 0,
                    comissao: 0,
                    receitaHoje: 0,
                    receitaMes: 0,
                    receitaTotal: 0,
                    vendasHoje: 0,
                    vendasMes: 0,
                    vendasTotal: 0,
                  }
                }
                index={(safePage - 1) * PAGE_SIZE + i}
                scope={scope}
                onOpen={() => setSelected({ member, index: (safePage - 1) * PAGE_SIZE + i })}
              />

            ))}
          </div>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </>
      )}

      {selected && (
        <SellerHistoryDialog
          open={!!selected}
          onOpenChange={(v) => !v && setSelected(null)}
          memberId={selected.member.id}
          memberName={selected.member.full_name}
          initials={selected.member.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          roles={selected.member.roles}
          avatarGradient={avatarGradients[selected.index % avatarGradients.length]}
        />
      )}
    </main>
  );
}

// ── Main Component ──
const Equipe = () => {
  const [role, setRole] = useState<Role>("SDR");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <FloatingHeader role={role} onRoleChange={setRole} />
          <AdminEquipeView />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Equipe;
