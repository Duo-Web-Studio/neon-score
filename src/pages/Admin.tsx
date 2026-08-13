import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Trash2,
} from "lucide-react";

interface PendingUser {
  id: string;
  full_name: string;
  status: string;
  created_at: string;
  email?: string;
  roles: string[];
}

export default function Admin() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profiles) {
      const { data: allRoles } = await supabase.from("user_roles").select("*");
      const roleMap = new Map<string, string[]>();
      allRoles?.forEach((r) => {
        const existing = roleMap.get(r.user_id) ?? [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      setUsers(
        profiles.map((p) => ({
          ...p,
          roles: roleMap.get(p.id) ?? [],
        }))
      );

    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const approveUser = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", userId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário aprovado!" });
    }

    await fetchUsers();
    setActionLoading(null);
  };

  const rejectUser = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: "rejected" })
      .eq("id", userId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário rejeitado" });
    }
    await fetchUsers();
    setActionLoading(null);
  };

  const deleteUser = async (userId: string, name: string) => {
    if (userId === user?.id) {
      toast({ title: "Ação não permitida", description: "Você não pode excluir a si mesmo.", variant: "destructive" });
      return;
    }
    if (!confirm(`Excluir definitivamente o usuário "${name}"? Esta ação não pode ser desfeita e o acesso será removido.`)) return;
    setActionLoading(userId);
    const { data, error } = await supabase.functions.invoke<{ error?: string }>("delete-user", {
      body: { user_id: userId },
    });
    if (error || data?.error) {
      toast({
        title: "Erro ao excluir",
        description: error?.message ?? data?.error ?? "Falha desconhecida",
        variant: "destructive",
      });

    } else {
      toast({ title: "Usuário excluído" });
    }
    await fetchUsers();
    setActionLoading(null);
  };

  const pendingUsers = users.filter((u) => u.status === "pending");
  const approvedUsers = users.filter((u) => u.status === "approved");

  const kpis = [
    { label: "Usuários Ativos", value: String(approvedUsers.length), icon: Users, color: "text-blue-400" },
    { label: "Pendentes", value: String(pendingUsers.length), icon: Clock, color: "text-yellow-400" },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <FloatingHeader role="SDR" onRoleChange={() => {}} />

          <div className="px-4 sm:px-6 pb-8 space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Painel Administrativo</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-2xl border border-border/50 bg-card/80 p-4 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl bg-muted/60 p-2 ${kpi.color}`}>
                      <kpi.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pending Users */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-6 backdrop-blur-xl">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                Usuários Pendentes ({pendingUsers.length})
              </h3>

              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingUsers.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum usuário pendente
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.map((u) => (
                    <PendingUserRow
                      key={u.id}
                      user={u}
                      loading={actionLoading === u.id}
                      onApprove={approveUser}
                      onReject={rejectUser}
                      onDelete={deleteUser}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Approved Users */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-6 backdrop-blur-xl">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Usuários Aprovados ({approvedUsers.length})
              </h3>

              {approvedUsers.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum usuário aprovado ainda
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Nome</th>
                        <th className="pb-2 font-medium">Cargos</th>
                        <th className="pb-2 font-medium">Desde</th>
                        <th className="pb-2 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedUsers.map((u) => (
                        <tr key={u.id} className="border-b border-border/30">
                          <td className="py-3 text-foreground">
                            {u.full_name}
                            {u.id === user?.id && (
                              <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              {u.roles.length > 0 ? u.roles.map((r) => (
                                <span key={r} className="rounded-lg bg-primary/20 px-2 py-1 text-xs font-medium text-primary">
                                  {r.toUpperCase()}
                                </span>
                              )) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3 text-right">
                            {u.id !== user?.id && (
                              <button
                                onClick={() => deleteUser(u.id, u.full_name)}
                                disabled={actionLoading === u.id}
                                title="Excluir usuário"
                                className="inline-flex items-center justify-center rounded-lg bg-destructive/15 p-1.5 text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-50"
                              >
                                {actionLoading === u.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function PendingUserRow({
  user,
  loading,
  onApprove,
  onReject,
  onDelete,
}: {
  user: PendingUser;
  loading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/30 bg-muted/20 p-4">
      <div>
        <p className="font-medium text-foreground">{user.full_name}</p>
        <p className="text-xs text-muted-foreground">
          Cadastrado em {new Date(user.created_at).toLocaleDateString("pt-BR")}
        </p>
        <div className="mt-1 flex gap-1">
          {user.roles.map((r) => (
            <span key={r} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
              {r.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onApprove(user.id)}
          disabled={loading}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onReject(user.id)}
          disabled={loading}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          <XCircle className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(user.id, user.full_name)}
          disabled={loading}
          title="Excluir definitivamente"
          className="rounded-lg bg-destructive/15 px-2 py-1.5 text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
