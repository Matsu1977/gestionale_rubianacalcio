import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { calcolaStatoPagamento, STATO_COLORS, fetchMovimentiByRiferimento } from "@/lib/pagamenti";
import AddPaymentDialog from "@/components/shared/AddPaymentDialog";
import PaymentHistoryTable from "@/components/shared/PaymentHistoryTable";

type Abbonamento = Tables<"abbonamenti">;
type Movimento = Tables<"movimenti">;

const formSchema = z.object({
  persona_id: z.string().min(1, "Seleziona persona"),
  corso: z.string().min(1, "Corso obbligatorio"),
  stagione: z.string().min(1, "Stagione obbligatoria"),
  importo_totale: z.string().min(1).refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Importo non valido"),
  numero_rate: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 1, "Min 1 rata"),
});

export default function Abbonamenti() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Abbonamento | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const { data: abbonamenti = [], isLoading } = useQuery({
    queryKey: ["abbonamenti"],
    queryFn: async () => {
      const { data, error } = await supabase.from("abbonamenti").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: persone = [] } = useQuery({
    queryKey: ["persone"],
    queryFn: async () => {
      const { data, error } = await supabase.from("persone").select("id, nome, cognome").order("cognome");
      if (error) throw error;
      return data;
    },
  });

  const personeMap: Record<string, string> = {};
  for (const p of persone) personeMap[p.id] = `${p.cognome} ${p.nome}`;

  const { data: movimentiMap = {} } = useQuery({
    queryKey: ["movimenti-abbonamenti", abbonamenti.map((a) => a.id)],
    enabled: abbonamenti.length > 0,
    queryFn: () => fetchMovimentiByRiferimento("abbonamento", abbonamenti.map((a) => a.id)),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { persona_id: "", corso: "", stagione: "", importo_totale: "0", numero_rate: "1" },
  });

  const openCreate = () => { setEditing(null); form.reset({ persona_id: "", corso: "", stagione: "", importo_totale: "0", numero_rate: "1" }); setFormOpen(true); };
  const openEdit = (a: Abbonamento) => { setEditing(a); form.reset({ persona_id: a.persona_id, corso: a.corso, stagione: a.stagione, importo_totale: String(a.importo_totale), numero_rate: String(a.numero_rate) }); setFormOpen(true); };

  const upsert = useMutation({
    mutationFn: async (v: z.infer<typeof formSchema>) => {
      const movs = movimentiMap[(editing?.id) || ""] || [];
      const pag = calcolaStatoPagamento(movs, Number(v.importo_totale));
      const payload = { persona_id: v.persona_id, corso: v.corso, stagione: v.stagione, importo_totale: Number(v.importo_totale), numero_rate: Number(v.numero_rate), stato_pagamento: editing ? pag.stato : "Non pagato" };
      if (editing) { const { error } = await supabase.from("abbonamenti").update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("abbonamenti").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["abbonamenti"] }); toast.success(editing ? "Aggiornato" : "Creato"); setFormOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("abbonamenti").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["abbonamenti"] }); toast.success("Eliminato"); },
    onError: (e) => toast.error(e.message),
  });

  const addPayment = useMutation({
    mutationFn: async (payload: { data: string; importo: number; metodo_pagamento: Database["public"]["Enums"]["metodo_pagamento"]; note: string | null }) => {
      const a = abbonamenti.find((x) => x.id === detailId)!;
      const { error } = await supabase.from("movimenti").insert({
        ...payload, tipo: "Entrata" as const, categoria: "Abbonamento" as const, persona_id: a.persona_id, riferimento_tipo: "abbonamento", riferimento_id: a.id,
      });
      if (error) throw error;
      // Update stato_pagamento
      const allMovs = [...(movimentiMap[a.id] || []), { importo: payload.importo } as Movimento];
      const pag = calcolaStatoPagamento(allMovs, Number(a.importo_totale));
      await supabase.from("abbonamenti").update({ stato_pagamento: pag.stato }).eq("id", a.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movimenti-abbonamenti"] }); qc.invalidateQueries({ queryKey: ["abbonamenti"] }); toast.success("Pagamento registrato"); setPayOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const delPayment = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("movimenti").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movimenti-abbonamenti"] }); qc.invalidateQueries({ queryKey: ["abbonamenti"] }); toast.success("Pagamento eliminato"); },
    onError: (e) => toast.error(e.message),
  });

  const detailItem = abbonamenti.find((a) => a.id === detailId);
  const detailMovimenti = detailId ? (movimentiMap[detailId] || []) : [];
  const detailPag = detailItem ? calcolaStatoPagamento(detailMovimenti, Number(detailItem.importo_totale)) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Abbonamenti</h1>
          <p className="text-muted-foreground mt-1">Gestione abbonamenti corsi</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nuovo Abbonamento</Button>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">Caricamento...</div>
        ) : abbonamenti.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4"><BookOpen className="h-10 w-10 text-primary" /></div>
            <p className="text-lg font-semibold">Nessun abbonamento</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Corso</TableHead>
                <TableHead className="hidden md:table-cell">Stagione</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead className="hidden md:table-cell text-right">Pagato</TableHead>
                <TableHead className="w-[100px]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abbonamenti.map((a) => {
                const pag = calcolaStatoPagamento(movimentiMap[a.id] || [], Number(a.importo_totale));
                return (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => setDetailId(a.id)}>
                    <TableCell className="font-medium">{personeMap[a.persona_id] || "—"}</TableCell>
                    <TableCell>{a.corso}</TableCell>
                    <TableCell className="hidden md:table-cell">{a.stagione}</TableCell>
                    <TableCell><Badge variant="outline" className={STATO_COLORS[pag.stato]}>{pag.stato}</Badge></TableCell>
                    <TableCell className="text-right">€{Number(a.importo_totale).toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">€{pag.totalePagato.toFixed(2)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Abbonamento" : "Nuovo Abbonamento"}</DialogTitle>
            <DialogDescription>Compila i dati dell'abbonamento</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => upsert.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="persona_id" render={({ field }) => (
                <FormItem><FormLabel>Persona *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger></FormControl>
                    <SelectContent>{persone.map((p) => <SelectItem key={p.id} value={p.id}>{p.cognome} {p.nome}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="corso" render={({ field }) => (
                <FormItem><FormLabel>Corso *</FormLabel><FormControl><Input placeholder="es. Calcio Under 14" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="stagione" render={({ field }) => (
                  <FormItem><FormLabel>Stagione *</FormLabel><FormControl><Input placeholder="2025/2026" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="numero_rate" render={({ field }) => (
                  <FormItem><FormLabel>N. Rate</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="importo_totale" render={({ field }) => (
                <FormItem><FormLabel>Importo Totale (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Annulla</Button>
                <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Salvataggio..." : editing ? "Salva" : "Crea"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailId(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader>
                <SheetTitle>{detailItem.corso} — {detailItem.stagione}</SheetTitle>
                <SheetDescription>{personeMap[detailItem.persona_id]}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Importo totale</span><span className="font-medium">€{Number(detailItem.importo_totale).toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Rate previste</span><span className="font-medium">{detailItem.numero_rate}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Totale pagato</span><span className="font-medium">€{detailPag?.totalePagato.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Stato</span><Badge variant="outline" className={STATO_COLORS[detailPag?.stato || "Non pagato"]}>{detailPag?.stato}</Badge></div>
                <Separator />
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Pagamenti</h3>
                  <Button size="sm" onClick={() => setPayOpen(true)}><Plus className="h-4 w-4 mr-1" /> Aggiungi</Button>
                </div>
                <PaymentHistoryTable movimenti={detailMovimenti} onDelete={(id) => delPayment.mutate(id)} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AddPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        title={detailItem ? `Pagamento abbonamento ${personeMap[detailItem.persona_id]}` : ""}
        onSave={(d) => addPayment.mutate(d)}
        isSaving={addPayment.isPending}
      />
    </motion.div>
  );
}
