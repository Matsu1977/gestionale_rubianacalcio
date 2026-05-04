import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Heart, Search, CheckCircle, XCircle, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

type Persona = Tables<"persone">;
type MetodoPag = Database["public"]["Enums"]["metodo_pagamento"];

const METODI: MetodoPag[] = ["Contanti", "Bonifico", "Carta", "Satispay", "Altro"];

export default function Soci() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [quotaDialog, setQuotaDialog] = useState<Persona | null>(null);
  const [importo, setImporto] = useState("50");
  const [metodo, setMetodo] = useState<MetodoPag>("Contanti");
  const [newSocioOpen, setNewSocioOpen] = useState(false);
  const [tabMode, setTabMode] = useState<"existing" | "new">("existing");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [newSocio, setNewSocio] = useState({ nome: "", cognome: "", codice_fiscale: "", email: "", telefono: "" });

  const { data: sociIds = [] } = useQuery({
    queryKey: ["ruoli-socio"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ruoli").select("persona_id").eq("tipo_ruolo", "Socio");
      if (error) throw error;
      return data.map((r) => r.persona_id);
    },
  });

  const { data: persone = [], isLoading } = useQuery({
    queryKey: ["persone"],
    queryFn: async () => {
      const { data, error } = await supabase.from("persone").select("*").order("cognome", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: quotePagate = {} } = useQuery({
    queryKey: ["quote-socio"],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const { data, error } = await supabase
        .from("movimenti")
        .select("persona_id, importo")
        .eq("categoria", "Quota socio")
        .gte("data", `${year}-01-01`)
        .lte("data", `${year}-12-31`);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const m of data) {
        if (m.persona_id) {
          map[m.persona_id] = (map[m.persona_id] || 0) + Number(m.importo);
        }
      }
      return map;
    },
  });

  const pagaQuotaMutation = useMutation({
    mutationFn: async ({ persona, importo, metodo }: { persona: Persona; importo: number; metodo: MetodoPag }) => {
      const { error } = await supabase.from("movimenti").insert({
        tipo: "Entrata",
        categoria: "Quota socio",
        importo,
        metodo_pagamento: metodo,
        persona_id: persona.id,
        riferimento: `Quota associativa ${new Date().getFullYear()}`,
        note: `Quota socio annuale ${new Date().getFullYear()} - ${persona.cognome} ${persona.nome}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-socio"] });
      queryClient.invalidateQueries({ queryKey: ["movimenti-all"] });
      toast.success("Quota associativa registrata");
      setQuotaDialog(null);
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const soci = persone.filter((p) => sociIds.includes(p.id));

  const filtered = soci.filter((p) => {
    const q = search.toLowerCase();
    return p.nome.toLowerCase().includes(q) || p.cognome.toLowerCase().includes(q) || (p.codice_fiscale?.toLowerCase().includes(q) ?? false);
  });

  const totSoci = soci.length;
  const totQuotePagate = soci.filter((s) => (quotePagate[s.id] || 0) > 0).length;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Soci</h1>
          <p className="text-muted-foreground mt-1">
            {totSoci} soci registrati · {totQuotePagate} quote pagate ({new Date().getFullYear()})
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cerca socio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4"><Heart className="h-10 w-10 text-primary" /></div>
            <p className="text-lg font-semibold">Nessun socio trovato</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Prova a modificare la ricerca" : "Assegna il ruolo \"Socio\" a una persona dalla sezione Persone"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cognome</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Telefono</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="text-center">Quota {new Date().getFullYear()}</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead className="w-[100px]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const pagato = quotePagate[p.id] || 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.cognome}</TableCell>
                    <TableCell>{p.nome}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.telefono || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.email || "—"}</TableCell>
                    <TableCell className="text-center">
                      {pagato > 0 ? (
                        <Badge variant="outline" className="bg-green-500/15 text-green-700 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" /> Pagata
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-500/30">
                          <XCircle className="h-3 w-3 mr-1" /> Non pagata
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {pagato > 0 ? `€${pagato.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>
                      {pagato === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => { setQuotaDialog(p); setImporto("50"); setMetodo("Contanti"); }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Quota
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Quota Dialog */}
      <Dialog open={!!quotaDialog} onOpenChange={(open) => { if (!open) setQuotaDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registra Quota Associativa</DialogTitle>
            <DialogDescription>
              Registra il pagamento della quota annuale per {quotaDialog?.cognome} {quotaDialog?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Importo (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={importo}
                onChange={(e) => setImporto(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Metodo di Pagamento</Label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPag)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METODI.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuotaDialog(null)}>Annulla</Button>
            <Button
              disabled={pagaQuotaMutation.isPending || !importo || Number(importo) <= 0}
              onClick={() => {
                if (quotaDialog) {
                  pagaQuotaMutation.mutate({ persona: quotaDialog, importo: Number(importo), metodo });
                }
              }}
            >
              {pagaQuotaMutation.isPending ? "Salvataggio..." : "Registra Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
