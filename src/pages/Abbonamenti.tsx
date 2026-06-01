import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, CalendarCheck, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { isBefore, parseISO, addDays, addMonths, format } from "date-fns";
import AbbonamentoDialog from "@/components/abbonamenti/AbbonamentoDialog";
import DeleteAbbonamentoDialog from "@/components/abbonamenti/DeleteAbbonamentoDialog";

type Abbonamento = Tables<"abbonamenti">;

const STATO_COLORS: Record<string, string> = {
  "Pagato": "bg-green-500/15 text-green-700 border-green-500/30",
  "Parziale": "bg-amber-500/15 text-amber-700 border-amber-500/30",
  "Non pagato": "bg-red-500/15 text-red-700 border-red-500/30",
};

function getMesiFrequenza(freq: string): number {
  switch (freq) {
    case "Mensile": return 1;
    case "Bimestrale": return 2;
    case "Trimestrale": return 3;
    case "Quadrimestrale": return 4;
    case "Semestrale": return 6;
    default: return 1;
  }
}

function getProssimaScadenza(dataInizio: string, frequenza: string): Date {
  const start = parseISO(dataInizio);
  const mesi = getMesiFrequenza(frequenza);
  const now = new Date();
  let scadenza = start;
  // Find next future expiry
  while (isBefore(scadenza, now)) {
    scadenza = addMonths(scadenza, mesi);
  }
  return scadenza;
}

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

  // Get movimenti linked to abbonamenti for payment status (per riferimento_tipo)
  const { data: movimentiAbb = [] } = useQuery({
    queryKey: ["movimenti-abbonamenti"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti")
        .select("riferimento_id, importo")
        .eq("riferimento_tipo", "abbonamento")
        .eq("tipo", "Entrata");
      if (error) throw error;
      return data;
    },
  });

  const pagatoPerAbb = movimentiAbb.reduce<Record<string, number>>((acc, m) => {
    if (m.riferimento_id) {
      acc[m.riferimento_id] = (acc[m.riferimento_id] || 0) + Number(m.importo);
    }
    return acc;
  }, {});

  const upsertMutation = useMutation({
    mutationFn: async (abb: TablesInsert<"abbonamenti"> & { id?: string }) => {
      const payload = { ...abb } as any;
      if (abb.id) {
        const { error } = await supabase.from("abbonamenti").update(payload).eq("id", abb.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("abbonamenti")
          .insert(payload)
          .select("id, persona_id, corso, importo_totale, stagione")
          .single();
        if (error) throw error;
        // Genera movimento contabile collegato (entrata)
        const importo = Number(inserted.importo_totale) || 0;
        if (importo > 0) {
          const { error: movErr } = await supabase.from("movimenti").insert({
            tipo: "Entrata",
            categoria: "Abbonamento",
            metodo_pagamento: "Contanti",
            importo,
            persona_id: inserted.persona_id,
            riferimento: `Abbonamento ${inserted.corso} ${inserted.stagione}`,
            note: `Abbonamento ${inserted.corso} - stagione ${inserted.stagione}`,
            riferimento_tipo: "abbonamento",
            riferimento_id: inserted.id,
          });
          if (movErr) throw movErr;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["abbonamenti"] });
      queryClient.invalidateQueries({ queryKey: ["movimenti-abbonamenti"] });
      queryClient.invalidateQueries({ queryKey: ["movimenti-all"] });
      toast.success(variables.id ? "Abbonamento aggiornato" : "Abbonamento creato e registrato in contabilità");
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

  // Compute scadenza alerts
  const today = new Date();
  const abbScaduti = filtered.filter(a => {
    const scad = getProssimaScadenza(a.data_inizio, a.tipo_pagamento);
    return isBefore(scad, today);
  });
  const abbInScadenza = filtered.filter(a => {
    const scad = getProssimaScadenza(a.data_inizio, a.tipo_pagamento);
    return !isBefore(scad, today) && isBefore(scad, addDays(today, 7));
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Abbonamenti</h1>
          <p className="text-muted-foreground mt-1">Gestione abbonamenti corsi e scadenze</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nuovo Abbonamento
        </Button>
      </div>

      {/* Alerts */}
      {(abbScaduti.length > 0 || abbInScadenza.length > 0) && (
        <div className="space-y-2">
          {abbScaduti.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <XCircle className="h-4 w-4 shrink-0" />
              <span><strong>{abbScaduti.length}</strong> abbonament{abbScaduti.length === 1 ? "o scaduto" : "i scaduti"}</span>
            </div>
          )}
          {abbInScadenza.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span><strong>{abbInScadenza.length}</strong> abbonament{abbInScadenza.length === 1 ? "o in scadenza" : "i in scadenza"} entro 7 giorni</span>
            </div>
          )}
        </div>
      )}

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
                <TableHead>Frequenza</TableHead>
                <TableHead>Prossima Scadenza</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Pagato / Totale</TableHead>
                <TableHead className="w-[100px]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const pagato = pagatoPerAbb[a.id] || 0;
                const totale = Number(a.importo_totale);
                const statoDerivato = pagato >= totale && totale > 0
                  ? "Pagato"
                  : pagato > 0
                  ? "Parziale"
                  : "Non pagato";
                const scadenza = getProssimaScadenza(a.data_inizio, a.tipo_pagamento);
                const isScaduto = isBefore(scadenza, today);
                const isInScadenza = !isScaduto && isBefore(scadenza, addDays(today, 7));
                return (
                  <TableRow key={a.id} className={isScaduto ? "bg-red-500/5" : isInScadenza ? "bg-amber-500/5" : ""}>
                    <TableCell className="font-medium">{personeMap[a.persona_id] || "—"}</TableCell>
                    <TableCell>{a.corso}</TableCell>
                    <TableCell>{a.stagione}</TableCell>
                    <TableCell>{a.tipo_pagamento}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={isScaduto ? "bg-red-500/15 text-red-700 border-red-500/30" : isInScadenza ? "bg-amber-500/15 text-amber-700 border-amber-500/30" : ""}>
                        {format(scadenza, "dd/MM/yyyy")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATO_COLORS[statoDerivato]}>
                        {statoDerivato}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{pagato.toFixed(2)} / €{totale.toFixed(2)}
                    </TableCell>
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
                );
              })}
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
