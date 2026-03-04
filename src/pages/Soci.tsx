import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Plus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { calcolaStatoPagamento, STATO_COLORS } from "@/lib/pagamenti";
import AddPaymentDialog from "@/components/shared/AddPaymentDialog";
import PaymentHistoryTable from "@/components/shared/PaymentHistoryTable";

type TipoRuolo = Database["public"]["Enums"]["tipo_ruolo"];

const QUOTA_ANNUALE = 50;

export default function Soci() {
  const qc = useQueryClient();
  const [detailPersonaId, setDetailPersonaId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const { data: sociData = [], isLoading } = useQuery({
    queryKey: ["soci"],
    queryFn: async () => {
      const { data: ruoli, error: rErr } = await supabase.from("ruoli").select("persona_id").eq("tipo_ruolo", "Socio" as TipoRuolo);
      if (rErr) throw rErr;
      if (ruoli.length === 0) return [];
      const ids = ruoli.map((r) => r.persona_id);
      const { data: persone, error: pErr } = await supabase.from("persone").select("*").in("id", ids).order("cognome");
      if (pErr) throw pErr;
      return persone;
    },
  });

  const { data: movimentiMap = {} } = useQuery({
    queryKey: ["movimenti-quota-socio", sociData.map((s) => s.id)],
    enabled: sociData.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti")
        .select("*")
        .eq("riferimento_tipo", "quota_socio")
        .in("persona_id", sociData.map((s) => s.id))
        .order("data", { ascending: false });
      if (error) throw error;
      const map: Record<string, Tables<"movimenti">[]> = {};
      for (const m of data) {
        const key = m.persona_id!;
        if (!map[key]) map[key] = [];
        map[key].push(m);
      }
      return map;
    },
  });

  const detailPersona = sociData.find((s) => s.id === detailPersonaId);
  const detailMovimenti = detailPersonaId ? (movimentiMap[detailPersonaId] || []) : [];
  const detailPag = calcolaStatoPagamento(detailMovimenti, QUOTA_ANNUALE);

  const addPayment = useMutation({
    mutationFn: async (payload: { data: string; importo: number; metodo_pagamento: Database["public"]["Enums"]["metodo_pagamento"]; note: string | null }) => {
      const { error } = await supabase.from("movimenti").insert({
        ...payload, tipo: "Entrata" as const, categoria: "Quota socio" as const, persona_id: detailPersonaId!, riferimento_tipo: "quota_socio", riferimento_id: detailPersonaId!,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movimenti-quota-socio"] }); toast.success("Pagamento registrato"); setPayOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const delPayment = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("movimenti").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movimenti-quota-socio"] }); toast.success("Eliminato"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Soci</h1>
        <p className="text-muted-foreground mt-1">Gestione quote associative dei soci (quota annuale: €{QUOTA_ANNUALE})</p>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">Caricamento...</div>
        ) : sociData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4"><UserCheck className="h-10 w-10 text-primary" /></div>
            <p className="text-lg font-semibold">Nessun socio registrato</p>
            <p className="text-sm text-muted-foreground mt-1">Assegna il ruolo "Socio" a una persona dalla sezione Persone</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cognome</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Telefono</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Quota</TableHead>
                <TableHead className="text-right">Pagato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sociData.map((s) => {
                const pag = calcolaStatoPagamento(movimentiMap[s.id] || [], QUOTA_ANNUALE);
                return (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetailPersonaId(s.id)}>
                    <TableCell className="font-medium">{s.cognome}</TableCell>
                    <TableCell>{s.nome}</TableCell>
                    <TableCell className="hidden md:table-cell">{s.telefono || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{s.email || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={STATO_COLORS[pag.stato]}>{pag.stato}</Badge></TableCell>
                    <TableCell className="text-right font-medium">€{pag.totalePagato.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Sheet open={!!detailPersona} onOpenChange={(o) => { if (!o) setDetailPersonaId(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailPersona && (
            <>
              <SheetHeader>
                <SheetTitle>{detailPersona.cognome} {detailPersona.nome}</SheetTitle>
                <SheetDescription>Quota associativa socio</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Quota annuale</span><span className="font-medium">€{QUOTA_ANNUALE.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Totale pagato</span><span className="font-medium">€{detailPag.totalePagato.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Stato</span><Badge variant="outline" className={STATO_COLORS[detailPag.stato]}>{detailPag.stato}</Badge></div>
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
        title={detailPersona ? `Quota socio ${detailPersona.nome} ${detailPersona.cognome}` : ""}
        onSave={(d) => addPayment.mutate(d)}
        isSaving={addPayment.isPending}
      />
    </motion.div>
  );
}
