import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  ClipboardCheck, Calendar as CalendarIcon, Users, Check, X, Loader2, BarChart3, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Presenze() {
  const queryClient = useQueryClient();
  const [selectedCorso, setSelectedCorso] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showStats, setShowStats] = useState(false);

  // Get distinct corsi from abbonamenti
  const { data: corsi = [] } = useQuery({
    queryKey: ["corsi-presenze"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abbonamenti")
        .select("corso")
        .eq("stato_pagamento", "Pagato")
        .order("corso");
      if (error) throw error;
      const unique = [...new Set((data || []).map((a) => a.corso))];
      return unique;
    },
  });

  // Get athletes subscribed to selected corso
  const { data: atleti = [], isLoading: loadingAtleti } = useQuery({
    queryKey: ["atleti-corso", selectedCorso],
    queryFn: async () => {
      if (!selectedCorso) return [];
      const { data, error } = await supabase
        .from("abbonamenti")
        .select("persona_id, persone(id, nome, cognome)")
        .eq("corso", selectedCorso)
        .eq("stato_pagamento", "Pagato");
      if (error) throw error;
      // Deduplicate by persona_id
      const seen = new Set();
      return (data || [])
        .filter((a: any) => {
          if (seen.has(a.persona_id)) return false;
          seen.add(a.persona_id);
          return true;
        })
        .map((a: any) => ({
          id: a.persone.id,
          nome: a.persone.nome,
          cognome: a.persone.cognome,
        }))
        .sort((a: any, b: any) => a.cognome.localeCompare(b.cognome));
    },
    enabled: !!selectedCorso,
  });

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Get or create sessione for selected corso + date
  const { data: sessione, isLoading: loadingSessione } = useQuery({
    queryKey: ["sessione", selectedCorso, dateStr],
    queryFn: async () => {
      if (!selectedCorso) return null;
      const { data, error } = await supabase
        .from("sessioni_allenamento")
        .select("*")
        .eq("corso", selectedCorso)
        .eq("data", dateStr)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCorso,
  });

  // Get presenze for the sessione
  const { data: presenze = [] } = useQuery({
    queryKey: ["presenze", sessione?.id],
    queryFn: async () => {
      if (!sessione?.id) return [];
      const { data, error } = await supabase
        .from("presenze")
        .select("*")
        .eq("sessione_id", sessione.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessione?.id,
  });

  // Stats: all sessioni for the corso
  const { data: allSessioni = [] } = useQuery({
    queryKey: ["stats-sessioni", selectedCorso],
    queryFn: async () => {
      if (!selectedCorso) return [];
      const { data, error } = await supabase
        .from("sessioni_allenamento")
        .select("id, data")
        .eq("corso", selectedCorso)
        .order("data", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCorso && showStats,
  });

  const { data: allPresenze = [] } = useQuery({
    queryKey: ["stats-presenze", selectedCorso, allSessioni.length],
    queryFn: async () => {
      if (!allSessioni.length) return [];
      const ids = allSessioni.map((s) => s.id);
      const { data, error } = await supabase
        .from("presenze")
        .select("*")
        .in("sessione_id", ids)
        .eq("presente", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCorso && showStats && allSessioni.length > 0,
  });

  const atletiStats = useMemo(() => {
    if (!atleti.length || !allSessioni.length) return [];
    const totalSessioni = allSessioni.length;
    return atleti.map((a: any) => {
      const presenzeCount = allPresenze.filter((p: any) => p.persona_id === a.id).length;
      const percentuale = totalSessioni > 0 ? Math.round((presenzeCount / totalSessioni) * 100) : 0;
      return { ...a, presenzeCount, totalSessioni, percentuale };
    }).sort((a: any, b: any) => b.percentuale - a.percentuale);
  }, [atleti, allSessioni, allPresenze]);

  const createSessioneMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("sessioni_allenamento")
        .insert({ corso: selectedCorso, data: dateStr })
        .select()
        .single();
      if (error) throw error;
      // Create presence entries for all athletes
      if (atleti.length > 0) {
        const rows = atleti.map((a: any) => ({
          sessione_id: data.id,
          persona_id: a.id,
          presente: false,
        }));
        await supabase.from("presenze").insert(rows);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessione", selectedCorso, dateStr] });
      queryClient.invalidateQueries({ queryKey: ["presenze"] });
      toast.success("Sessione creata");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const togglePresenzaMutation = useMutation({
    mutationFn: async ({ personaId, presente }: { personaId: string; presente: boolean }) => {
      if (!sessione?.id) throw new Error("Nessuna sessione");
      const { error } = await supabase
        .from("presenze")
        .upsert(
          { sessione_id: sessione.id, persona_id: personaId, presente },
          { onConflict: "sessione_id,persona_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presenze", sessione?.id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const presenzeMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    presenze.forEach((p: any) => { map[p.persona_id] = p.presente; });
    return map;
  }, [presenze]);

  const presentiCount = presenze.filter((p: any) => p.presente).length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Presenze</h1>
            <p className="text-sm text-muted-foreground">Registro presenze allenamenti</p>
          </div>
        </div>
        {selectedCorso && (
          <Button variant="outline" onClick={() => setShowStats(!showStats)}>
            <BarChart3 className="mr-2 h-4 w-4" />
            {showStats ? "Registro" : "Statistiche"}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedCorso} onValueChange={setSelectedCorso}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Seleziona corso" />
          </SelectTrigger>
          <SelectContent>
            {corsi.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!showStats && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[220px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "d MMMM yyyy", { locale: it })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={it} />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {!selectedCorso && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Seleziona un corso per iniziare a registrare le presenze
          </CardContent>
        </Card>
      )}

      {/* Attendance Register */}
      {selectedCorso && !showStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedCorso} — {format(selectedDate, "d MMMM yyyy", { locale: it })}
                </CardTitle>
                <CardDescription>
                  {sessione
                    ? `${presentiCount}/${atleti.length} presenti`
                    : "Nessuna sessione registrata per questa data"}
                </CardDescription>
              </div>
              {!sessione && !loadingSessione && atleti.length > 0 && (
                <Button onClick={() => createSessioneMutation.mutate()} disabled={createSessioneMutation.isPending}>
                  {createSessioneMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Crea sessione
                </Button>
              )}
            </div>
            {sessione && atleti.length > 0 && (
              <Progress value={(presentiCount / atleti.length) * 100} className="mt-3 h-2" />
            )}
          </CardHeader>
          <CardContent>
            {loadingAtleti || loadingSessione ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : atleti.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nessun atleta abbonato a questo corso</p>
            ) : !sessione ? (
              <p className="text-center text-muted-foreground py-8">Clicca "Crea sessione" per registrare le presenze</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Atleta</TableHead>
                    <TableHead className="w-[100px] text-center">Presente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atleti.map((a: any, i: number) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{a.cognome} {a.nome}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={presenzeMap[a.id] ?? false}
                          onCheckedChange={(checked) =>
                            togglePresenzaMutation.mutate({ personaId: a.id, presente: !!checked })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {selectedCorso && showStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiche presenze — {selectedCorso}
            </CardTitle>
            <CardDescription>
              {allSessioni.length} sessioni registrate
            </CardDescription>
          </CardHeader>
          <CardContent>
            {atletiStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nessun dato disponibile</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Atleta</TableHead>
                    <TableHead className="text-center">Presenze</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead className="w-[200px]">Frequenza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atletiStats.map((a: any, i: number) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{a.cognome} {a.nome}</TableCell>
                      <TableCell className="text-center">{a.presenzeCount}/{a.totalSessioni}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          a.percentuale >= 75 ? "border-green-500/30 text-green-700 bg-green-500/10" :
                          a.percentuale >= 50 ? "border-amber-500/30 text-amber-700 bg-amber-500/10" :
                          "border-destructive/30 text-destructive bg-destructive/10"
                        )}>
                          {a.percentuale}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Progress value={a.percentuale} className="h-2" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
