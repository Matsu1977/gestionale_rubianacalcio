import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import TesseramentoDialog from "@/components/tesseramenti/TesseramentoDialog";
import DeleteTesseramentoDialog from "@/components/tesseramenti/DeleteTesseramentoDialog";

type Tesseramento = Tables<"tesseramenti">;

const STATO_COLORS: Record<string, string> = {
  Attivo: "bg-green-500/15 text-green-700 border-green-500/30",
  Scaduto: "bg-red-500/15 text-red-700 border-red-500/30",
  Sospeso: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};

export default function Tesseramenti() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tesseramento | null>(null);
  const [deleting, setDeleting] = useState<Tesseramento | null>(null);

  const { data: tesseramenti = [], isLoading } = useQuery({
    queryKey: ["tesseramenti"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tesseramenti")
        .select("*")
        .order("created_at", { ascending: false });
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
    mutationFn: async (tess: TablesInsert<"tesseramenti"> & { id?: string }) => {
      if (tess.id) {
        const { error } = await supabase.from("tesseramenti").update(tess).eq("id", tess.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tesseramenti").insert(tess);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tesseramenti"] });
      toast.success(variables.id ? "Tesseramento aggiornato" : "Tesseramento creato");
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tesseramenti").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tesseramenti"] });
      toast.success("Tesseramento eliminato");
      setDeleting(null);
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const filtered = tesseramenti.filter((t) => {
    const q = search.toLowerCase();
    const nome = personeMap[t.persona_id] || "";
    return (
      nome.toLowerCase().includes(q) ||
      t.stagione.toLowerCase().includes(q) ||
      t.tipo_tesseramento.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tesseramenti</h1>
          <p className="text-muted-foreground mt-1">Gestione tesseramenti e stato attività</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nuovo Tesseramento
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cerca per persona, stagione..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4"><IdCard className="h-10 w-10 text-primary" /></div>
            <p className="text-lg font-semibold">Nessun tesseramento trovato</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Prova a modificare la ricerca" : "Clicca \"Nuovo Tesseramento\" per aggiungerne uno"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Stagione</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="hidden md:table-cell">Inizio</TableHead>
                <TableHead className="hidden md:table-cell">Fine</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead className="w-[100px]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{personeMap[t.persona_id] || "—"}</TableCell>
                  <TableCell>{t.stagione}</TableCell>
                  <TableCell>{t.tipo_tesseramento}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATO_COLORS[t.stato] || ""}>{t.stato}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{new Date(t.data_inizio).toLocaleDateString("it-IT")}</TableCell>
                  <TableCell className="hidden md:table-cell">{t.data_fine ? new Date(t.data_fine).toLocaleDateString("it-IT") : "—"}</TableCell>
                  <TableCell className="text-right font-medium">€{Number(t.importo).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(t)}>
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

      <TesseramentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tesseramento={editing}
        personeMap={personeMap}
        onSave={(data) => upsertMutation.mutate(data)}
        isSaving={upsertMutation.isPending}
      />

      <DeleteTesseramentoDialog
        tesseramento={deleting}
        personaNome={deleting ? (personeMap[deleting.persona_id] || "") : ""}
        onOpenChange={(open) => { if (!open) setDeleting(null); }}
        onConfirm={() => { if (deleting) deleteMutation.mutate(deleting.id); }}
        isDeleting={deleteMutation.isPending}
      />
    </motion.div>
  );
}
