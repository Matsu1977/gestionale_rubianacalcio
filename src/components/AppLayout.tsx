import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationBell } from "@/components/NotificationBell";
import { SendNotificaDialog } from "@/components/SendNotificaDialog";
import { useAuth } from "@/hooks/useAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/50 px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <h2 className="text-sm font-medium text-muted-foreground hidden sm:block">
              Gestionale Rubiana Calcio
            </h2>
            <div className="ml-auto flex items-center gap-2">
              {(role === "admin" || role === "allenatore" || role === "atleta") && <SendNotificaDialog />}
              <NotificationBell />
              <GlobalSearch />
            </div>
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
