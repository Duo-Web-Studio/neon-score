import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { AvatarUploader } from "@/components/dashboard/AvatarUploader";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

type Role = "SDR" | "Closer";

const Perfil = () => {
  const { user, profile, roles } = useAuth();
  const [role, setRole] = useState<Role>("SDR");

  const roleLabel = roles.includes("admin")
    ? "Administrador"
    : roles.map((r) => r.toUpperCase()).join(" / ") || "—";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <FloatingHeader role={role} onRoleChange={setRole} />
          <main className="flex-1 px-3 sm:px-4 pb-8">
            <div className="mx-auto max-w-2xl">
              <h1 className="mb-6 text-2xl font-bold text-foreground">Meu perfil</h1>

              <div className="glass-card p-8">
                <AvatarUploader />

                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{profile?.full_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">E-mail</p>
                    <p className="mt-1 text-base font-semibold text-foreground break-all">{user?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cargo</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{roleLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Perfil;
