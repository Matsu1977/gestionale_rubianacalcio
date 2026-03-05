import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Heart, Search, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Persona = Tables<"persone">;

export default function Soci() {
  const [search, setSearch] = useState("");

  // Get all persona IDs with role "Socio"
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

  // Fetch quota socio payments for current year
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </motion.div>
  );
}
