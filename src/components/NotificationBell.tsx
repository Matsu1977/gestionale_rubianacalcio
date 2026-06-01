import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notifica {
  id: string;
  titolo: string;
  messaggio: string;
  tipo: string;
  letta: boolean;
  user_id: string | null;
  ruolo_destinatario: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifiche = [] } = useQuery({
    queryKey: ["notifiche", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifiche")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as Notifica[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: letteIds = [] } = useQuery({
    queryKey: ["notifiche-lette", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifiche_lette")
        .select("notifica_id");
      return (data || []).map((r) => r.notifica_id);
    },
    enabled: !!user,
  });

  const isRead = (n: Notifica) => {
    if (n.user_id === user?.id) return n.letta;
    return letteIds.includes(n.id);
  };

  const unreadCount = notifiche.filter((n) => !isRead(n)).length;

  const markRead = useMutation({
    mutationFn: async (notifica: Notifica) => {
      if (notifica.user_id === user?.id) {
        await supabase.from("notifiche").update({ letta: true }).eq("id", notifica.id);
      } else {
        await supabase.from("notifiche_lette").insert({
          notifica_id: notifica.id,
          user_id: user!.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifiche"] });
      queryClient.invalidateQueries({ queryKey: ["notifiche-lette"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifiche.filter((n) => !isRead(n));
      for (const n of unread) {
        if (n.user_id === user?.id) {
          await supabase.from("notifiche").update({ letta: true }).eq("id", n.id);
        } else {
          await supabase.from("notifiche_lette").upsert({
            notifica_id: n.id,
            user_id: user!.id,
          }, { onConflict: "notifica_id,user_id" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifiche"] });
      queryClient.invalidateQueries({ queryKey: ["notifiche-lette"] });
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notifiche</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => markAllRead.mutate()}
              >
                Segna tutte come lette
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {notifiche.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessuna notifica
            </p>
          ) : (
            <div className="space-y-2">
              {notifiche.map((n) => {
                const read = isRead(n);
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors",
                      read ? "bg-background border-border/50" : "bg-primary/5 border-primary/20"
                    )}
                    onClick={() => !read && markRead.mutate(n)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                          <p className={cn("text-sm font-medium truncate", !read && "text-primary")}>
                            {n.titolo}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {n.messaggio}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {n.tipo === "automatica" ? "Auto" : "Info"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: it })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
