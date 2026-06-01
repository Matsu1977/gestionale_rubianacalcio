import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Link2, Loader2, ArrowRight, CheckCircle2, FilterX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

type RifTipo = "abbonamento" | "tessera_ingressi" | "tesseramento" | "quota_socio";

export default function MigrazioneMovimenti() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [selectedTipo, setSelectedTipo] = useState<Record<string, RifTipo>>({});
  const [selectedServizio, setSelectedServizio] = useState<Record<string, string>>({});

  // Solo admin
  if (role && role !== "admin") return <Navigate to="/" replace />;

  // Movimenti Entrate con persona ma senza riferimento_id (da migrare)
  const { data: movimenti = [], isLoading } = useQuery({
    queryKey: ["movimenti-da-migrare"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti")
        .select("*")
        .eq("tipo", "Entrata")
        .not("persona_id", "is", null)
        .is("riferimento_id", null)
        .order("data", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const personeIds = useMemo(
    () => Array.from(new Set(movimenti.map((m: any) => m.persona_id).filter(Boolean))),
    [movimenti]
  );

  const { data: personeMap = {} } = useQuery({
    queryKey: ["persone-migrate-map"],
    queryFn: async () => {
      const { data } = await supabase.from("persone").select("id, nome, cognome");
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = `${p.cognome} ${p.nome}`; });
      return map;
    },
  });

  // Carica tutti i servizi per le persone coinvolte (in 3 query)
  const { data: abbonamenti = [] } = useQuery({
    queryKey: ["mig-abbonamenti", personeIds.length],
    queryFn: async () => {
      if (!personeIds.length) return [];
      const { data } = await supabase
        .from("abbonamenti")
        .select("id, persona_id, corso, stagione, importo_totale")
        .in("persona_id", personeIds);
      return data || [];
    },
    enabled: personeIds.length > 0,
  });

  const { data: tessere = [] } = useQuery({
    queryKey: ["mig-tessere", personeIds.length],
    queryFn: async () => {
      if (!personeIds.length) return [];
      const { data } = await supabase
        .from("tessere_ingressi")
        .select("id, persona_id, corso, importo, data_acquisto")
        .in("persona_id", personeIds);
      return data || [];
    },
    enabled: personeIds.length > 0,
  });

  const { data: tesseramenti = [] } = useQuery({
    queryKey: ["mig-tesseramenti", personeIds.length],
    queryFn: async () => {
      if (!personeIds.length) return [];
      const { data } = await supabase
        .from("tesseramenti")
        .select("id, persona_id, stagione, tipo_tesseramento, importo")
        .in("persona_id", personeIds);
      return data || [];
    },
    enabled: personeIds.length > 0,
  });

  const linkMutation = useMutation({
    mutationFn: async ({ movId, tipo, servId }: { movId: string; tipo: RifTipo; servId: string }) => {
      const { error } = await supabase
        .from("movimenti")
        .update({ riferimento_tipo: tipo, riferimento_id: servId })
        .eq("id", movId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movimenti-da-migrare"] });
      qc.invalidateQueries({ queryKey: ["movimenti-abbonamenti"] });
      qc.invalidateQueries({ queryKey: ["movimenti-all"] });
      toast.success("Movimento collegato al servizio");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getServiziPerPersona = (personaId: string, tipo: RifTipo) => {
    if (tipo === "abbonamento") return abbonamenti.filter((a: any) => a.persona_id === personaId);
    if (tipo === "tessera_ingressi") return tessere.filter((t: any) => t.persona_id === personaId);
    if (tipo === "tesseramento" || tipo === "quota_socio") return tesseramenti.filter((t: any) => t.persona_id === personaId);
    return [];
  };

  const labelServizio = (tipo: RifTipo, s: any): string => {
    if (tipo === "abbonamento") return `${s.corso} — ${s.stagione} (€${Number(s.importo_totale).toFixed(2)})`;
    if (tipo === "tessera_ingressi") return `${s.corso} — ${format(parseISO(s.data_acquisto), "dd/MM/yyyy")} (€${Number(s.importo).toFixed(2)})`;
    return `${s.tipo_tesseramento} — ${s.stagione} (€${Number(s.importo).toFixed(2)})`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Link2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Migrazione movimenti storici</h1>
          <p className="text-sm text-muted-foreground">
            Solo per dati vecchi. I nuovi pagamenti vengono collegati automaticamente dalla schermata "Nuova Entrata".
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {movimenti.length === 0 ? (
              <><CheckCircle2 className="h-4 w-4 text-green-600" /> Tutto collegato</>
            ) : (
              <>{movimenti.length} movimenti da rivedere</>
            )}
          </CardTitle>
          <CardDescription>
            Solo le entrate con persona ma senza riferimento a un servizio. Una volta collegate, il sistema le userà per calcolare lo stato pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : movimenti.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <FilterX className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nessun movimento da migrare. Tutte le entrate con persona sono già collegate a un servizio.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead className="hidden md:table-cell">Note</TableHead>
                  <TableHead>Tipo servizio</TableHead>
                  <TableHead>Servizio</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimenti.map((m: any) => {
                  const tipo = selectedTipo[m.id];
                  const servId = selectedServizio[m.id];
                  const servizi = tipo ? getServiziPerPersona(m.persona_id, tipo) : [];
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{format(parseISO(m.data), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium text-sm">{personeMap[m.persona_id] || "—"}</TableCell>
                      <TableCell className="text-sm font-medium text-green-600">€{Number(m.importo).toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{m.note || "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={tipo || ""}
                          onValueChange={(v: RifTipo) => {
                            setSelectedTipo((s) => ({ ...s, [m.id]: v }));
                            setSelectedServizio((s) => ({ ...s, [m.id]: "" }));
                          }}
                        >
                          <SelectTrigger className="w-[160px] h-8"><SelectValue placeholder="Scegli tipo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="abbonamento">Abbonamento</SelectItem>
                            <SelectItem value="tessera_ingressi">Tessera ingressi</SelectItem>
                            <SelectItem value="tesseramento">Tesseramento</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={servId || ""}
                          disabled={!tipo || servizi.length === 0}
                          onValueChange={(v) => setSelectedServizio((s) => ({ ...s, [m.id]: v }))}
                        >
                          <SelectTrigger className="w-[260px] h-8">
                            <SelectValue placeholder={
                              !tipo ? "—" : servizi.length === 0 ? "Nessun servizio disponibile" : "Scegli servizio"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {servizi.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>{labelServizio(tipo, s)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          disabled={!tipo || !servId || linkMutation.isPending}
                          onClick={() => linkMutation.mutate({ movId: m.id, tipo, servId })}
                        >
                          <ArrowRight className="h-3 w-3 mr-1" /> Collega
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

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Badge variant="outline">Suggerimento</Badge>
            <p className="text-sm text-muted-foreground">
              Usa la data e l'importo del movimento per individuare il servizio corretto. Una volta collegato, lo stato dell'abbonamento o della tessera verrà aggiornato automaticamente nelle relative pagine.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
