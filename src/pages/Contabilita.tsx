import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Movimento = Tables<"movimenti">;
type Persona = Tables<"persone">;

export default function Contabilita() {
  const { data: movimenti = [], isLoading } = useQuery({
    queryKey: ["movimenti-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti")
        .select("*")
        .order("data", { ascending: false });
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

  const totaleEntrate = movimenti.filter((m) => m.tipo === "Entrata").reduce((s, m) => s + Number(m.importo), 0);
  const totaleUscite = movimenti.filter((m) => m.tipo === "Uscita").reduce((s, m) => s + Number(m.importo), 0);
  const saldo = totaleEntrate - totaleUscite;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contabilità</h1>
        <p className="text-muted-foreground mt-1">Registro entrate, uscite e movimenti finanziari</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="p-3 rounded-xl bg-green-500/10">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Totale Entrate</p>
              <p className="text-2xl font-bold text-green-600">€{totaleEntrate.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="p-3 rounded-xl bg-red-500/10">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Totale Uscite</p>
              <p className="text-2xl font-bold text-red-600">€{totaleUscite.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="p-3 rounded-xl bg-primary/10">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className={`text-2xl font-bold ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>€{saldo.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movimenti table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">Caricamento...</div>
        ) : movimenti.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4">
              <Wallet className="h-10 w-10 text-primary" />
            </div>
            <p className="text-lg font-semibold">Nessun movimento registrato</p>
            <p className="text-sm text-muted-foreground mt-1">I movimenti appariranno qui quando verranno registrati pagamenti</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Persona</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Metodo</TableHead>
                <TableHead className="hidden lg:table-cell">Note</TableHead>
                <TableHead className="text-right">Importo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimenti.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">{new Date(m.data).toLocaleDateString("it-IT")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={m.tipo === "Entrata" ? "bg-green-500/10 text-green-700 border-green-500/30" : "bg-red-500/10 text-red-700 border-red-500/30"}>
                      {m.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{m.persona_id ? (personeMap[m.persona_id] || "—") : "—"}</TableCell>
                  <TableCell className="text-sm">{m.categoria}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{m.metodo_pagamento}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{m.note || "—"}</TableCell>
                  <TableCell className={`text-right font-medium ${m.tipo === "Entrata" ? "text-green-600" : "text-red-600"}`}>
                    {m.tipo === "Uscita" ? "−" : "+"}€{Number(m.importo).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </motion.div>
  );
}
