import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Clock } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/components/dashboard/AppSidebar";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, roles, loading, signOut } = useAuth();

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <header className="sticky top-0 z-30 mx-2 sm:mx-4 mt-2 sm:mt-4 mb-4 sm:mb-6 flex items-center justify-between rounded-2xl border border-border/50 bg-card/60 px-3 sm:px-4 py-2 sm:py-3 backdrop-blur-xl">
              <div className="space-y-2">
                <Skeleton className="h-3 w-36 bg-muted/70" />
                <Skeleton className="h-2.5 w-28 bg-muted/50" />
              </div>
              <Skeleton className="h-8 w-24 rounded-xl bg-muted/60" />
            </header>
            <main className="flex-1 px-3 sm:px-4 pb-8">
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="glass-card p-5">
                    <Skeleton className="mb-3 h-3 w-24 bg-muted/60" />
                    <Skeleton className="h-8 w-16 bg-muted/70" />
                  </div>
                ))}
              </div>
              <div className="glass-card p-6">
                <Skeleton className="mb-6 h-4 w-40 bg-muted/60" />
                <Skeleton className="h-64 w-full rounded-2xl bg-muted/50" />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile && profile.status !== "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card/80 p-8 text-center backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-foreground">Aguardando Aprovação</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Seu cadastro foi recebido e está aguardando aprovação de um administrador. Você será notificado quando seu acesso for liberado.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-muted px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted/80"
            >
              Verificar novamente
            </button>
            <button
              onClick={() => signOut()}
              className="rounded-xl px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Voltar ao login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (allowedRoles && roles.length > 0 && !roles.some((r) => allowedRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
