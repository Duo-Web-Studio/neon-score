import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  Zap,
  Layers,
  UserCheck,
  XCircle,
  Percent,
  Monitor,
  UserCircle,
  Sparkles,
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import nextLogo from "@/assets/next-logo.jpg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const employeeItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Performance", url: "/performance", icon: TrendingUp },
  { title: "Pipeline", url: "/pipeline", icon: BarChart3 },
  { title: "Clientes", url: "/clientes", icon: UserCheck },
  { title: "Sem conversão", url: "/perdidos", icon: XCircle },
  { title: "Equipe", url: "/equipe", icon: Users },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Show me", url: "/show-me", icon: Sparkles },
  { title: "Comissões", url: "/comissoes", icon: Percent },
  { title: "Meu perfil", url: "/perfil", icon: UserCircle },
];

const adminItems = [
  { title: "Painel Admin", url: "/admin", icon: LayoutDashboard },
  { title: "Meu Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Minha Performance", url: "/performance", icon: TrendingUp },
  { title: "Pipeline", url: "/pipeline", icon: BarChart3 },
  { title: "Clientes", url: "/clientes", icon: UserCheck },
  { title: "Sem conversão", url: "/perdidos", icon: XCircle },
  { title: "Minhas Metas", url: "/metas", icon: Target },
  { title: "Show me", url: "/show-me", icon: Sparkles },
  { title: "Minhas Comissões", url: "/comissoes", icon: Percent },
  { title: "TV", url: "/tv", icon: Monitor },
  { title: "Gestão de Metas", url: "/admin/metas", icon: Target },
  { title: "Organização", url: "/admin/organizacao", icon: Layers },
  { title: "Comissões (Admin)", url: "/admin/comissoes", icon: Percent },
  { title: "Equipe", url: "/equipe", icon: Users },
  { title: "Meu perfil", url: "/perfil", icon: UserCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { roles } = useAuth();

  const isAdmin = roles.includes("admin");
  const items = isAdmin ? adminItems : employeeItems;

  return (
    <Sidebar variant="floating" collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img
            src={nextLogo}
            alt="Next Marketing"
            className="h-9 w-9 rounded-xl object-cover shadow-lg ring-1 ring-primary/30 glow-yellow"
          />
          {!collapsed && (
            <div className="leading-tight">
              <span className="block text-lg font-bold gradient-text">Next</span>
              <span className="block text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Marketing
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/60 text-xs uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="group/btn relative transition-all duration-200 hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                    >
                      <Link to={item.url}>
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary" />
                        )}
                        <item.icon
                          className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-125"
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>
  );
}
