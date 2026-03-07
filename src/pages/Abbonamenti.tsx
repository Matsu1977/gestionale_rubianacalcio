import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, CalendarCheck, Eye, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { isBefore, parseISO, addDays, addMonths, format } from "date-fns";
import AbbonamentoDialog from "@/components/abbonamenti/AbbonamentoDialog";
import DeleteAbbonamentoDialog from "@/components/abbonamenti/DeleteAbbonamentoDialog";
import RateSheet, { type Rata } from "@/components/abbonamenti/RateSheet";

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
  const [rateOpen, setRateOpen] = useState(false);
  const [selectedAbb, setSelectedAbb] = useState<Abbonamento | null>(null);

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

  const { data: allRate = [] } = useQuery<Rata[]>({
    queryKey: ["rate"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rate").select("*").order("numero_rata", { ascending: true });
      if (error) throw error;
      return data as unknown as Rata[];
    },
  });

  const rateByAbb = allRate.reduce<Record<string, Rata[]>>((acc, r) => {
    (acc[r.abbonamento_id] ||= []).push(r);
    return acc;
  }, {});

  const upsertMutation = useMutation({
    mutationFn: async (abb: TablesInsert<"abbonamenti"> & { id?: string; _tipo_pagamento?: string; _data_inizio?: string }) => {
      const tipoPagamento = abb._tipo_pagamento || "Pagamento unico";
      const dataInizio = abb._data_inizio || format(new Date(), "yyyy-MM-dd");
      // Remove internal fields before sending to DB
      const { _tipo_pagamento, _data_inizio, ...dbData } = abb as any;
      const insertData = { ...dbData, tipo_pagamento: tipoPagamento, data_inizio: dataInizio };

      if (abb.id) {
        const { error } = await supabase.from("abbonamenti").update(insertData).eq("id", abb.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("abbonamenti").insert(insertData).select().single();
        if (error) throw error;

        // Auto-generate rate based on tipo_pagamento
        const numRate = abb.numero_rate || 1;
        const importoTotale = abb.importo_totale || 0;
        const importoRata = Math.floor((importoTotale / numRate) * 100) / 100;
        const resto = Math.round((importoTotale - importoRata * numRate) * 100) / 100;
        const start = parseISO(dataInizio);
        const intervallo = tipoPagamento === "Trimestrale" ? 3 : tipoPagamento === "Quadrimestrale" ? 4 : 0;
        // Trimestrale → 3 rate ogni 3 mesi, Quadrimestrale → 4 rate ogni 4 mesi

        const rateToInsert = Array.from({ length: numRate }, (_, i) => ({
          abbonamento_id: data.id,
          numero_rata: i + 1,
          importo: i === 0 ? importoRata + resto : importoRata,
          data_scadenza: format(addMonths(start, i * intervallo), "yyyy-MM-dd"),
          stato: "Non pagata",
        }));

        const { error: rateErr } = await supabase.from("rate").insert(rateToInsert);
        if (rateErr) throw rateErr;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["abbonamenti"] });
      queryClient.invalidateQueries({ queryKey: ["rate"] });
      toast.success(variables.id ? "Abbonamento aggiornato" : "Abbonamento creato con rate generate");
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
      queryClient.invalidateQueries({ queryKey: ["rate"] });
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

  // Global alerts
  const today = new Date();
  const rateScadute = allRate.filter(r => r.stato === "Non pagata" && isBefore(parseISO(r.data_scadenza), today));
  const rateInScadenza = allRate.filter(r => {
    if (r.stato !== "Non pagata") return false;
    const scad = parseISO(r.data_scadenza);
    return !isBefore(scad, today) && isBefore(scad, addDays(today, 7));
  });

  // Helper: count scadute per abbonamento
  const scadutePerAbb = rateScadute.reduce<Record<string, number>>((acc, r) => {
    acc[r.abbonamento_id] = (acc[r.abbonamento_id] || 0) + 1;
    return acc;
  }, {});

  const selectedRate = selectedAbb ? (rateByAbb[selectedAbb.id] || []) : [];

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

      {/* Global alerts */}
      {(rateScadute.length > 0 || rateInScadenza.length > 0) && (
        <div className="space-y-2">
          {rateScadute.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <XCircle className="h-4 w-4 shrink-0" />
              <span><strong>{rateScadute.length}</strong> rat{rateScadute.length === 1 ? "a scaduta" : "e scadute"} non pagate</span>
            </div>
          )}
          {rateInScadenza.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span><strong>{rateInScadenza.length}</strong> rat{rateInScadenza.length === 1 ? "a in scadenza" : "e in scadenza"} entro 7 giorni</span>
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
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Pagato / Totale</TableHead>
                <TableHead className="hidden md:table-cell text-center">Rate</TableHead>
                <TableHead className="w-[130px]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const rate = rateByAbb[a.id] || [];
                const pagato = rate.filter(r => r.stato === "Pagata").reduce((s, r) => s + Number(r.importo), 0);
                const hasScadute = (scadutePerAbb[a.id] || 0) > 0;
                return (
                  <TableRow key={a.id} className={hasScadute ? "bg-red-500/5" : ""}>
                    <TableCell className="font-medium">{personeMap[a.persona_id] || "—"}</TableCell>
                    <TableCell>{a.corso}</TableCell>
                    <TableCell>{a.stagione}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATO_COLORS[a.stato_pagamento] || ""}>{a.stato_pagamento}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{pagato.toFixed(2)} / €{Number(a.importo_totale).toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      {rate.filter(r => r.stato === "Pagata").length}/{rate.length}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedAbb(a); setRateOpen(true); }} title="Vedi rate">
                          <Eye className="h-4 w-4" />
                        </Button>
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

      <RateSheet
        open={rateOpen}
        onOpenChange={setRateOpen}
        abbonamentoId={selectedAbb?.id || null}
        personaNome={selectedAbb ? (personeMap[selectedAbb.persona_id] || "") : ""}
        corso={selectedAbb?.corso || ""}
        importoTotale={Number(selectedAbb?.importo_totale || 0)}
        rate={selectedRate}
        personaId={selectedAbb?.persona_id || ""}
      />
    </motion.div>
  );
}
