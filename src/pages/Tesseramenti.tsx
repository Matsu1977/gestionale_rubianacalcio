import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
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

type Tesseramento = Tables<"tesseramenti">;

const formSchema = z.object({
  persona_id: z.string().min(1, "Seleziona persona"),
  stagione: z.string().min(1, "Stagione obbligatoria"),
  tipo_tesseramento: z.string().min(1, "Tipo obbligatorio"),
  data_inizio: z.string().min(1, "Data obbligatoria"),
  data_fine: z.string().optional().or(z.literal("")),
  stato: z.enum(["Attivo", "Scaduto", "In attesa"]),
  importo: z.string().min(1).refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Importo non valido"),
});

export default function Tesseramenti() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tesseramento | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const { data: tesseramenti = [], isLoading } = useQuery({
    queryKey: ["tesseramenti"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tesseramenti").select("*").order("created_at", { ascending: false });
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
    queryKey: ["movimenti-tesseramenti", tesseramenti.map((t) => t.id)],
    enabled: tesseramenti.length > 0,
    queryFn: () => fetchMovimentiByRiferimento("tesseramento", tesseramenti.map((t) => t.id)),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { persona_id: "", stagione: "", tipo_tesseramento: "Standard", data_inizio: new Date().toISOString().split("T")[0], data_fine: "", stato: "Attivo" as const, importo: "0" },
  });

  const openCreate = () => { setEditing(null); form.reset({ persona_id: "", stagione: "", tipo_tesseramento: "Standard", data_inizio: new Date().toISOString().split("T")[0], data_fine: "", stato: "Attivo", importo: "0" }); setFormOpen(true); };
  const openEdit = (t: Tesseramento) => { setEditing(t); form.reset({ persona_id: t.persona_id, stagione: t.stagione, tipo_tesseramento: t.tipo_tesseramento, data_inizio: t.data_inizio, data_fine: t.data_fine || "", stato: t.stato as "Attivo", importo: String(t.importo) }); setFormOpen(true); };

  const upsert = useMutation({
    mutationFn: async (v: z.infer<typeof formSchema>) => {
      const payload = { persona_id: v.persona_id, stagione: v.stagione, tipo_tesseramento: v.tipo_tesseramento, data_inizio: v.data_inizio, data_fine: v.data_fine || null, stato: v.stato, importo: Number(v.importo) };
      if (editing) { const { error } = await supabase.from("tesseramenti").update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("tesseramenti").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tesseramenti"] }); toast.success(editing ? "Aggiornato" : "Creato"); setFormOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("tesseramenti").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tesseramenti"] }); toast.success("Eliminato"); },
    onError: (e) => toast.error(e.message),
  });

  const addPayment = useMutation({
    mutationFn: async (payload: { data: string; importo: number; metodo_pagamento: Database["public"]["Enums"]["metodo_pagamento"]; note: string | null }) => {
      const t = tesseramenti.find((x) => x.id === detailId)!;
      const { error } = await supabase.from("movimenti").insert({
        ...payload, tipo: "Entrata" as const, categoria: "Tesseramento" as const, persona_id: t.persona_id, riferimento_tipo: "tesseramento", riferimento_id: t.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movimenti-tesseramenti"] }); toast.success("Pagamento registrato"); setPayOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const delPayment = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("movimenti").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movimenti-tesseramenti"] }); toast.success("Pagamento eliminato"); },
    onError: (e) => toast.error(e.message),
  });

  const detailItem = tesseramenti.find((t) => t.id === detailId);
  const detailMovimenti = detailId ? (movimentiMap[detailId] || []) : [];
  const detailPagamento = detailItem ? calcolaStatoPagamento(detailMovimenti, Number(detailItem.importo)) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tesseramenti</h1>
          <p className="text-muted-foreground mt-1">Gestione tesseramenti sportivi</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nuovo Tesseramento</Button>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">Caricamento...</div>
        ) : tesseramenti.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4"><FileText className="h-10 w-10 text-primary" /></div>
            <p className="text-lg font-semibold">Nessun tesseramento</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Stagione</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead className="w-[100px]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tesseramenti.map((t) => {
                const pag = calcolaStatoPagamento(movimentiMap[t.id] || [], Number(t.importo));
                return (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetailId(t.id)}>
                    <TableCell className="font-medium">{personeMap[t.persona_id] || "—"}</TableCell>
                    <TableCell>{t.stagione}</TableCell>
                    <TableCell className="hidden md:table-cell">{t.tipo_tesseramento}</TableCell>
                    <TableCell><Badge variant="outline">{t.stato}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={STATO_COLORS[pag.stato]}>{pag.stato}</Badge></TableCell>
                    <TableCell className="text-right">€{Number(t.importo).toFixed(2)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Tesseramento" : "Nuovo Tesseramento"}</DialogTitle>
            <DialogDescription>Compila i dati del tesseramento</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => upsert.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="persona_id" render={({ field }) => (
                <FormItem><FormLabel>Persona *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleziona persona" /></SelectTrigger></FormControl>
                    <SelectContent>{persone.map((p) => <SelectItem key={p.id} value={p.id}>{p.cognome} {p.nome}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="stagione" render={({ field }) => (
                  <FormItem><FormLabel>Stagione *</FormLabel><FormControl><Input placeholder="2025/2026" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tipo_tesseramento" render={({ field }) => (
                  <FormItem><FormLabel>Tipo *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="data_inizio" render={({ field }) => (
                  <FormItem><FormLabel>Data inizio *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="data_fine" render={({ field }) => (
                  <FormItem><FormLabel>Data fine</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="stato" render={({ field }) => (
                  <FormItem><FormLabel>Stato</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Attivo">Attivo</SelectItem>
                        <SelectItem value="Scaduto">Scaduto</SelectItem>
                        <SelectItem value="In attesa">In attesa</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="importo" render={({ field }) => (
                  <FormItem><FormLabel>Importo (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Annulla</Button>
                <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Salvataggio..." : editing ? "Salva" : "Crea"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailId(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader>
                <SheetTitle>Tesseramento {detailItem.stagione}</SheetTitle>
                <SheetDescription>{personeMap[detailItem.persona_id]} — {detailItem.tipo_tesseramento}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Importo dovuto</span><span className="font-medium">€{Number(detailItem.importo).toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Totale pagato</span><span className="font-medium">€{detailPagamento?.totalePagato.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Stato pagamento</span><Badge variant="outline" className={STATO_COLORS[detailPagamento?.stato || "Non pagato"]}>{detailPagamento?.stato}</Badge></div>
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
        title={detailItem ? `Pagamento tesseramento ${personeMap[detailItem.persona_id]}` : ""}
        onSave={(d) => addPayment.mutate(d)}
        isSaving={addPayment.isPending}
      />
    </motion.div>
  );
}
