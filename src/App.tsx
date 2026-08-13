import { lazy, Suspense, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { SplashScreen } from "@/components/SplashScreen";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";

const Pipeline = lazy(() => import("./pages/Pipeline.tsx"));
const Performance = lazy(() => import("./pages/Performance.tsx"));
const Metas = lazy(() => import("./pages/Metas.tsx"));
const Equipe = lazy(() => import("./pages/Equipe.tsx"));
const Clientes = lazy(() => import("./pages/Clientes.tsx"));
const Perdidos = lazy(() => import("./pages/Perdidos.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AdminMetas = lazy(() => import("./pages/AdminMetas.tsx"));
const AdminOrganizacao = lazy(() => import("./pages/AdminOrganizacao.tsx"));
const AdminComissoes = lazy(() => import("./pages/AdminComissoes.tsx"));
const Comissoes = lazy(() => import("./pages/Comissoes.tsx"));
const TV = lazy(() => import("./pages/TV.tsx"));
const ShowMe = lazy(() => import("./pages/ShowMe.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Perfil = lazy(() => import("./pages/Perfil.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <SidebarProvider>
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 mx-2 sm:mx-4 mt-2 sm:mt-4 mb-4 sm:mb-6 flex items-center justify-between rounded-2xl border border-border/50 bg-card/60 px-3 sm:px-4 py-2 sm:py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-xl bg-muted/60" />
            <div className="hidden sm:block space-y-2">
              <Skeleton className="h-3 w-36 bg-muted/70" />
              <Skeleton className="h-2.5 w-28 bg-muted/50" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Skeleton className="h-8 w-20 rounded-xl bg-muted/60" />
            <Skeleton className="h-8 w-8 rounded-xl bg-primary/15" />
            <Skeleton className="h-8 w-8 rounded-xl bg-muted/60" />
          </div>
        </header>

        <main className="flex-1 px-3 sm:px-4 pb-8">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="glass-card p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-24 bg-muted/60" />
                    <Skeleton className="h-8 w-16 bg-muted/70" />
                    <Skeleton className="h-3 w-12 bg-muted/50" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-xl bg-primary/15" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass-card p-6">
              <Skeleton className="mb-6 h-4 w-40 bg-muted/60" />
              <div className="flex h-56 items-end gap-3">
                {[48, 72, 56, 88, 64, 78].map((height, index) => (
                  <Skeleton key={index} className="flex-1 rounded-t-xl bg-muted/70" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
            <div className="glass-card p-6">
              <Skeleton className="mb-6 h-4 w-32 bg-muted/60" />
              <div className="space-y-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-xl bg-primary/15" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-32 bg-muted/70" />
                      <Skeleton className="h-2 w-full rounded-full bg-muted/50" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </SidebarProvider>
);

function AuthRedirect() {
  const { user, roles, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (!user) return <Auth />;
  if (roles.includes("admin")) return <Navigate to="/admin" replace />;
  return <Navigate to="/" replace />;
}

const allRoles = ["admin", "sdr", "closer"];

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/auth" element={<AuthRedirect />} />
              <Route path="/" element={<ProtectedRoute allowedRoles={allRoles}><Index /></ProtectedRoute>} />
              <Route path="/pipeline" element={<ProtectedRoute allowedRoles={allRoles}><Pipeline /></ProtectedRoute>} />
              <Route path="/performance" element={<ProtectedRoute allowedRoles={allRoles}><Performance /></ProtectedRoute>} />
              <Route path="/metas" element={<ProtectedRoute allowedRoles={allRoles}><Metas /></ProtectedRoute>} />
              <Route path="/equipe" element={<ProtectedRoute allowedRoles={allRoles}><Equipe /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute allowedRoles={allRoles}><Clientes /></ProtectedRoute>} />
              <Route path="/perdidos" element={<ProtectedRoute allowedRoles={allRoles}><Perdidos /></ProtectedRoute>} />
              <Route path="/tv" element={<ProtectedRoute allowedRoles={["admin"]}><TV /></ProtectedRoute>} />
              <Route path="/show-me" element={<ProtectedRoute allowedRoles={allRoles}><ShowMe /></ProtectedRoute>} />
              <Route path="/comissoes" element={<ProtectedRoute allowedRoles={allRoles}><Comissoes /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute allowedRoles={allRoles}><Perfil /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><Admin /></ProtectedRoute>} />
              <Route path="/admin/metas" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMetas /></ProtectedRoute>} />
              <Route path="/admin/organizacao" element={<ProtectedRoute allowedRoles={["admin"]}><AdminOrganizacao /></ProtectedRoute>} />
              <Route path="/admin/secoes" element={<ProtectedRoute allowedRoles={["admin"]}><Navigate to="/admin/organizacao?tab=secoes" replace /></ProtectedRoute>} />
              <Route path="/admin/pipeline" element={<ProtectedRoute allowedRoles={["admin"]}><Navigate to="/admin/organizacao?tab=pipeline" replace /></ProtectedRoute>} />
              <Route path="/admin/comissoes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminComissoes /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
