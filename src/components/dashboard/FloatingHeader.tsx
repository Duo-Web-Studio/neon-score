import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, User, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import nextLogo from "@/assets/next-logo.jpg";
import { AvatarImage } from "@/components/AvatarImage";

type Role = "SDR" | "Closer";

interface FloatingHeaderProps {
  role: Role;
  onRoleChange: (role: Role) => void;
}

export function FloatingHeader({ role, onRoleChange }: FloatingHeaderProps) {
  const { profile, roles: userRoles, signOut } = useAuth();
  const isAdmin = userRoles.includes("admin");
  const displayName = profile?.full_name || "Usuário";

  return (
    <header className="sticky top-0 z-30 mx-2 sm:mx-4 mt-2 sm:mt-4 mb-4 sm:mb-6 flex items-center justify-between rounded-2xl border border-border/50 bg-card/60 px-3 sm:px-4 py-2 sm:py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2 sm:gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <img
          src={nextLogo}
          alt="Next Marketing"
          className="hidden sm:block h-7 w-7 rounded-lg object-cover ring-1 ring-primary/30"
        />
        <div className="hidden sm:block h-6 w-px bg-border/50" />
        <div className="hidden sm:block">
          <h1 className="text-sm font-semibold text-foreground">
            Bem-vindo, {displayName}
          </h1>
          <p className="text-xs text-muted-foreground">
            Acompanhe sua performance
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Role Toggle - hidden for admins */}
        {!isAdmin && (
          <div className="flex items-center rounded-xl bg-muted/60 p-1">
            <button
              onClick={() => onRoleChange("SDR")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                role === "SDR"
                  ? "gradient-yellow-orange text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              SDR
            </button>
            <button
              onClick={() => onRoleChange("Closer")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                role === "Closer"
                  ? "gradient-orange-strong text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Closer
            </button>
          </div>
        )}

        <button className="relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>

        <Link
          to="/perfil"
          title="Meu perfil"
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-primary/20 text-primary ring-1 ring-primary/30 transition hover:ring-primary/60"
        >
          <AvatarImage
            value={profile?.avatar_url}
            alt="Perfil"
            className="h-full w-full object-cover"
            fallback={<User className="h-4 w-4" />}
          />
        </Link>

        <button
          onClick={signOut}
          className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
