import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, CalendarCheck, Wallet, X } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: persone = [] } = useQuery({
    queryKey: ["search-persone"],
    queryFn: async () => {
      const { data, error } = await supabase.from("persone").select("id, nome, cognome, email, telefono");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: abbonamenti = [] } = useQuery({
    queryKey: ["search-abbonamenti"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abbonamenti")
        .select("id, corso, stagione, stato_pagamento, persona_id, persone(nome, cognome)");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: movimenti = [] } = useQuery({
    queryKey: ["search-movimenti"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti")
        .select("id, tipo, categoria, importo, data, persona_id, persone(nome, cognome)")
        .order("data", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 sm:w-64 sm:justify-start sm:px-3 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline-flex">Cerca...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Cerca persone, abbonamenti, pagamenti..." />
        <CommandList>
          <CommandEmpty>Nessun risultato trovato.</CommandEmpty>

          <CommandGroup heading="Persone">
            {persone.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.cognome} ${p.nome} ${p.email ?? ""} ${p.telefono ?? ""}`}
                onSelect={() => {
                  navigate("/persone");
                  setOpen(false);
                }}
              >
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{p.cognome} {p.nome}</span>
                {p.email && <span className="ml-2 text-xs text-muted-foreground">{p.email}</span>}
                {p.telefono && <span className="ml-2 text-xs text-muted-foreground">{p.telefono}</span>}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Abbonamenti">
            {abbonamenti.map((a) => {
              const persona = a.persone as any;
              return (
                <CommandItem
                  key={a.id}
                  value={`${persona?.cognome ?? ""} ${persona?.nome ?? ""} ${a.corso} ${a.stagione}`}
                  onSelect={() => {
                    navigate("/abbonamenti");
                    setOpen(false);
                  }}
                >
                  <CalendarCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{persona?.cognome} {persona?.nome}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{a.corso} — {a.stagione}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">{a.stato_pagamento}</Badge>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Pagamenti">
            {movimenti.map((m) => {
              const persona = m.persone as any;
              return (
                <CommandItem
                  key={m.id}
                  value={`${persona?.cognome ?? ""} ${persona?.nome ?? ""} ${m.categoria} ${m.tipo}`}
                  onSelect={() => {
                    navigate("/contabilita");
                    setOpen(false);
                  }}
                >
                  <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{persona?.cognome ?? "—"} {persona?.nome ?? ""}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{m.categoria}</span>
                  <Badge variant={m.tipo === "Entrata" ? "default" : "destructive"} className="ml-auto text-[10px]">
                    €{Number(m.importo).toFixed(2)}
                  </Badge>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
