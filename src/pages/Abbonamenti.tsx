import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import AbbonamentoDialog from "@/components/abbonamenti/AbbonamentoDialog";
import DeleteAbbonamentoDialog from "@/components/abbonamenti/DeleteAbbonamentoDialog";

type Abbonamento = Tables<"abbonamenti">;

const STATO_COLORS: Record<string, string> = {
  "Pagato": "bg-green-500/15 text-green-700 border-green-500/30",
  "Parziale": "bg-amber-500/15 text-amber-700 border-amber-500/30",
  "Non pagato": "bg-red-500/15 text-red-700 border-red-500/30",
};

export default function Abbonamenti() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Abbonamento | null>(null);
  const [deleting, setDeleting] = useState<Abbonamento | null>(null);

  const { data: abbonamenti = [], isLoading } = useQuery({
    queryKey: ["abbonamenti"],
    queryFn: async () => {
      const { data, error } = await supabase.from("abbonamenti").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: personeMap = {} } = useQuery({
    queryKey: ["persone-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("persone").select("id, nome, cognome");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const p of data) map[p.id] = `${p.cognome} ${p.nome}`;
      return map;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (abb: TablesInsert<"abbonamenti"> & { id?: string }) => {
      if (abb.id) {
        const { error } = await supabase.from("abbonamenti").update(abb).eq("id", abb.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("abbonamenti").insert(abb);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["abbonamenti"] });
      toast.success(variables.id ? "Abbonamento aggiornato" : "Abbonamento creato");
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("abbonamenti").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abbonamenti"] });
      toast.success("Abbonamento eliminato");
      setDeleting(null);
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const filtered = abbonamenti.filter((a) => {
    const q = search.toLowerCase();
    const nome = personeMap[a.persona_id] || "";
    return nome.toLowerCase().includes(q) || a.corso.toLowerCase().includes(q) || a.stagione.toLowerCase().includes(q);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Abbonamenti</h1>
          <p className="text-muted-foreground mt-1">Gestione abbonamenti corsi e stato pagamenti</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nuovo Abbonamento
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cerca per persona, corso, stagione..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4"><CalendarCheck className="h-10 w-10 text-primary" /></div>
            <p className="text-lg font-semibold">Nessun abbonamento trovato</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Prova a modificare la ricerca" : "Clicca \"Nuovo Abbonamento\" per aggiungerne uno"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Corso</TableHead>
                <TableHead>Stagione</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead className="hidden md:table-cell text-center">Rate</TableHead>
                <TableHead className="w-[100px]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{personeMap[a.persona_id] || "—"}</TableCell>
                  <TableCell>{a.corso}</TableCell>
                  <TableCell>{a.stagione}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATO_COLORS[a.stato_pagamento] || ""}>{a.stato_pagamento}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">€{Number(a.importo_totale).toFixed(2)}</TableCell>
                  <TableCell className="hidden md:table-cell text-center">{a.numero_rate}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(a)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AbbonamentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        abbonamento={editing}
        personeMap={personeMap}
        onSave={(data) => upsertMutation.mutate(data)}
        isSaving={upsertMutation.isPending}
      />

      <DeleteAbbonamentoDialog
        abbonamento={deleting}
        personaNome={deleting ? (personeMap[deleting.persona_id] || "") : ""}
        onOpenChange={(open) => { if (!open) setDeleting(null); }}
        onConfirm={() => { if (deleting) deleteMutation.mutate(deleting.id); }}
        isDeleting={deleteMutation.isPending}
      />
    </motion.div>
  );
}
