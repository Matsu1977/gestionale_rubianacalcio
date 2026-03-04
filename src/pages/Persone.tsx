import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import PersonaDialog from "@/components/persone/PersonaDialog";
import DeletePersonaDialog from "@/components/persone/DeletePersonaDialog";

type Persona = Tables<"persone">;
type TipoRuolo = Database["public"]["Enums"]["tipo_ruolo"];

const RUOLO_COLORS: Record<TipoRuolo, string> = {
  Dirigente: "bg-primary/15 text-primary border-primary/30",
  Socio: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  Abbonato: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Atleta: "bg-green-500/15 text-green-700 border-green-500/30",
  Allenatore: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  Genitore: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

export default function Persone() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [deletingPersona, setDeletingPersona] = useState<Persona | null>(null);

  const { data: persone = [], isLoading } = useQuery({
    queryKey: ["persone"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("persone")
        .select("*")
        .order("cognome", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all ruoli grouped by persona_id
  const { data: ruoliMap = {} } = useQuery({
    queryKey: ["ruoli"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ruoli").select("*");
      if (error) throw error;
      const map: Record<string, TipoRuolo[]> = {};
      for (const r of data) {
        if (!map[r.persona_id]) map[r.persona_id] = [];
        map[r.persona_id].push(r.tipo_ruolo);
      }
      return map;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ persona, ruoli }: { persona: TablesInsert<"persone"> & { id?: string }; ruoli: TipoRuolo[] }) => {
      let personaId = persona.id;

      if (personaId) {
        const { error } = await supabase.from("persone").update(persona).eq("id", personaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("persone").insert(persona).select("id").single();
        if (error) throw error;
        personaId = data.id;
      }

      // Sync ruoli: delete all existing, then insert new ones
      await supabase.from("ruoli").delete().eq("persona_id", personaId);
      if (ruoli.length > 0) {
        const { error } = await supabase.from("ruoli").insert(
          ruoli.map((tipo_ruolo) => ({ persona_id: personaId!, tipo_ruolo }))
        );
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["persone"] });
      queryClient.invalidateQueries({ queryKey: ["ruoli"] });
      toast.success(variables.persona.id ? "Persona aggiornata" : "Persona creata");
      setDialogOpen(false);
      setEditingPersona(null);
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("persone").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persone"] });
      queryClient.invalidateQueries({ queryKey: ["ruoli"] });
      toast.success("Persona eliminata");
      setDeletingPersona(null);
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });

  const filtered = persone.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.nome.toLowerCase().includes(q) ||
      p.cognome.toLowerCase().includes(q) ||
      (p.codice_fiscale?.toLowerCase().includes(q) ?? false) ||
      (p.email?.toLowerCase().includes(q) ?? false)
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
          <h1 className="text-3xl font-bold tracking-tight">Persone</h1>
          <p className="text-muted-foreground mt-1">Gestione anagrafica di atleti, soci, genitori e staff</p>
        </div>
        <Button onClick={() => { setEditingPersona(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nuova Persona
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per nome, cognome, CF, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <p className="text-lg font-semibold">Nessuna persona trovata</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Prova a modificare la ricerca" : "Clicca \"Nuova Persona\" per aggiungerne una"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cognome</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ruoli</TableHead>
                <TableHead className="hidden md:table-cell">Telefono</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Cert. Medico</TableHead>
                <TableHead className="w-[100px]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((persona) => (
                <TableRow key={persona.id}>
                  <TableCell className="font-medium">{persona.cognome}</TableCell>
                  <TableCell>{persona.nome}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(ruoliMap[persona.id] || []).map((ruolo) => (
                        <Badge key={ruolo} variant="outline" className={RUOLO_COLORS[ruolo]}>
                          {ruolo}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{persona.telefono || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{persona.email || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {persona.certificato_medico_scadenza
                      ? new Date(persona.certificato_medico_scadenza).toLocaleDateString("it-IT")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingPersona(persona); setDialogOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPersona(persona)}
                      >
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

      <PersonaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        persona={editingPersona}
        personaRuoli={editingPersona ? (ruoliMap[editingPersona.id] || []) : []}
        onSave={(persona, ruoli) => upsertMutation.mutate({ persona, ruoli })}
        isSaving={upsertMutation.isPending}
      />

      <DeletePersonaDialog
        persona={deletingPersona}
        onOpenChange={(open) => { if (!open) setDeletingPersona(null); }}
        onConfirm={() => { if (deletingPersona) deleteMutation.mutate(deletingPersona.id); }}
        isDeleting={deleteMutation.isPending}
      />
    </motion.div>
  );
}
