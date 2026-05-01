import {
  LayoutDashboard,
  Users,
  IdCard,
  CalendarCheck,
  Heart,
  Wallet,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  ClipboardCheck,
  Ticket,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const allMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["admin", "segreteria", "allenatore"] },
  { title: "La mia Area", url: "/", icon: LayoutDashboard, roles: ["atleta"] },
  { title: "Persone", url: "/persone", icon: Users, roles: ["admin", "segreteria"] },
  { title: "Tesseramenti", url: "/tesseramenti", icon: IdCard, roles: ["admin", "segreteria"] },
  { title: "Abbonamenti", url: "/abbonamenti", icon: CalendarCheck, roles: ["admin", "segreteria", "allenatore"] },
  { title: "Soci", url: "/soci", icon: Heart, roles: ["admin", "segreteria"] },
  { title: "Contabilità", url: "/contabilita", icon: Wallet, roles: ["admin", "segreteria"] },
  { title: "Comunicazioni", url: "/comunicazioni", icon: MessageSquare, roles: ["admin", "segreteria", "allenatore"] },
  { title: "Report", url: "/report", icon: BarChart3, roles: ["admin", "segreteria"] },
  { title: "Presenze", url: "/presenze", icon: ClipboardCheck, roles: ["admin", "segreteria", "allenatore"] },
  { title: "Tessere Ingressi", url: "/tessere-ingressi", icon: Ticket, roles: ["admin", "segreteria"] },
  { title: "Impostazioni", url: "/impostazioni", icon: Settings, roles: ["admin"] },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Amministratore",
  segreteria: "Segreteria",
  allenatore: "Allenatore",
  atleta: "Atleta",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role, user, signOut } = useAuth();

  const menuItems = allMenuItems.filter((item) => role && item.roles.includes(role));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Rubiana Calcio" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                Rubiana Calcio
              </span>
              <span className="text-[11px] text-sidebar-foreground/60">
                Gestionale ASD
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/60 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        {!collapsed && role && (
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="text-[10px] border-sidebar-border text-sidebar-foreground/60">
              {ROLE_LABELS[role] || role}
            </Badge>
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Esci
          </Button>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
        {!collapsed && (
          <p className="text-[11px] text-sidebar-foreground/40 text-center">
            Stagione 2025/2026
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
