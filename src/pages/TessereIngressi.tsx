import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket, Plus, Loader2, Trash2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

type Tessera = {
  id: string;
  persona_id: string;
  corso: string;
  ingressi_totali: number;
  ingressi_usati: number;
  importo: number;
  data_acquisto: string;
  stato_pagamento: string;
  note: string | null;
};

export default function TessereIngressi() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    persona_id: "",
    corso: "",
    importo: "",
    note: "",
  });

  const { data: tessere = [], isLoading } = useQuery({
    queryKey: ["tessere-ingressi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tessere_ingressi")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tessera[];
    },
  });

  const { data: persone = [] } = useQuery({
    queryKey: ["persone-tessere"],
    queryFn: async () => {
      const { data } = await supabase.from("persone").select("id, nome, cognome").order("cognome");
      return data || [];
    },
  });

  const { data: corsi = [] } = useQuery({
    queryKey: ["corsi-attivi"],
    queryFn: async () => {
      const { data } = await supabase.from("corsi").select("nome").eq("attivo", true).order("nome");
      return (data || []).map((c) => c.nome);
    },
  });

  const personeMap: Record<string, string> = {};
  persone.forEach((p: any) => { personeMap[p.id] = `${p.cognome} ${p.nome}`; });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.persona_id || !form.corso) throw new Error("Atleta e corso sono obbligatori");
      const { error } = await supabase.from("tessere_ingressi").insert({
        persona_id: form.persona_id,
        corso: form.corso,
        ingressi_totali: 11, // 10 paganti + 1 omaggio
        ingressi_usati: 0,
        importo: Number(form.importo) || 0,
        stato_pagamento: "Pagato",
        note: form.note || null,
      });
      if (error) throw error;

      // Registra movimento contabile se importo > 0
      if (Number(form.importo) > 0) {
        await supabase.from("movimenti").insert({
          tipo: "Entrata",
          categoria: "Abbonamento",
          metodo_pagamento: "Contanti",
          importo: Number(form.importo),
          persona_id: form.persona_id,
          note: `Tessera 10+1 ingressi - ${form.corso}`,
          riferimento_tipo: "tessera_ingressi",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tessere-ingressi"] });
      toast.success("Tessera creata: 10 ingressi + 1 omaggio");
      setOpen(false);
      setForm({ persona_id: "", corso: "", importo: "", note: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tessere_ingressi").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tessere-ingressi"] });
      toast.success("Tessera eliminata");
    },
  });

  const getStatus = (t: Tessera) => {
    const rimasti = t.ingressi_totali - t.ingressi_usati;
    if (rimasti <= 0) return { label: "Esaurita", variant: "destructive" as const };
    if (rimasti <= 2) return { label: "In esaurimento", variant: "secondary" as const };
    return { label: "Attiva", variant: "default" as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Ticket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tessere Ingressi</h1>
            <p className="text-sm text-muted-foreground">Tessere prepagate 10 ingressi + 1 omaggio</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nuova Tessera</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuova Tessera 10+1</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Atleta *</Label>
                <Select value={form.persona_id} onValueChange={(v) => setForm({ ...form, persona_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleziona atleta" /></SelectTrigger>
                  <SelectContent>
                    {persone.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.cognome} {p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Corso *</Label>
                <Select value={form.corso} onValueChange={(v) => setForm({ ...form, corso: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleziona corso" /></SelectTrigger>
                  <SelectContent>
                    {corsi.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Importo €</Label>
                <Input type="number" step="0.01" value={form.importo} onChange={(e) => setForm({ ...form, importo: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Verrà registrato automaticamente in contabilità come entrata.</p>
              </div>
              <div>
                <Label>Note</Label>
                <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crea
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tessere registrate</CardTitle>
          <CardDescription>Ogni tessera include 10 ingressi paganti + 1 omaggio (totale 11)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          ) : tessere.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nessuna tessera registrata</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atleta</TableHead>
                  <TableHead>Corso</TableHead>
                  <TableHead>Acquisto</TableHead>
                  <TableHead>Ingressi</TableHead>
                  <TableHead className="w-[200px]">Utilizzo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tessere.map((t) => {
                  const status = getStatus(t);
                  const pct = (t.ingressi_usati / t.ingressi_totali) * 100;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{personeMap[t.persona_id] || "—"}</TableCell>
                      <TableCell>{t.corso}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseISO(t.data_acquisto), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{t.ingressi_totali - t.ingressi_usati}</span>
                        <span className="text-muted-foreground"> / {t.ingressi_totali}</span>
                      </TableCell>
                      <TableCell><Progress value={pct} className="h-2" /></TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (confirm("Eliminare questa tessera?")) deleteMutation.mutate(t.id);
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
