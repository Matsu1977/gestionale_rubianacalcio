import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { MessageSquare, Send, Users, User, BookOpen, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type TipoDestinatari = "tutti" | "corso" | "singolo";

export default function Comunicazioni() {
  const queryClient = useQueryClient();
  const [oggetto, setOggetto] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [tipoDestinatari, setTipoDestinatari] = useState<TipoDestinatari>("tutti");
  const [corsoFiltro, setCorsoFiltro] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch persone for single recipient selector
  const { data: persone = [] } = useQuery({
    queryKey: ["persone-comunicazioni"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("persone")
        .select("id, nome, cognome")
        .order("cognome");
      if (error) throw error;
      return data;
    },
  });

  // Fetch distinct corsi from abbonamenti
  const { data: corsi = [] } = useQuery({
    queryKey: ["corsi-comunicazioni"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abbonamenti")
        .select("corso");
      if (error) throw error;
      const unique = [...new Set(data.map((a) => a.corso))].filter(Boolean).sort();
      return unique;
    },
  });

  // Fetch comunicazioni history with destinatari count
  const { data: comunicazioni = [], isLoading } = useQuery({
    queryKey: ["comunicazioni"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comunicazioni")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch destinatari for expanded comunicazione
  const { data: destinatariExpanded = [] } = useQuery({
    queryKey: ["comunicazioni-destinatari", expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comunicazioni_destinatari")
        .select("persona_id")
        .eq("comunicazione_id", expandedId!);
      if (error) throw error;
      // Resolve names
      const ids = data.map((d) => d.persona_id);
      if (ids.length === 0) return [];
      const { data: people } = await supabase
        .from("persone")
        .select("id, nome, cognome")
        .in("id", ids);
      return people || [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      // Determine recipients
      let recipientIds: string[] = [];

      if (tipoDestinatari === "tutti") {
        // All tesserati (people with active tesseramento)
        const { data } = await supabase
          .from("tesseramenti")
          .select("persona_id")
          .eq("stato", "Attivo");
        recipientIds = [...new Set((data || []).map((t) => t.persona_id))];
      } else if (tipoDestinatari === "corso") {
        if (!corsoFiltro) throw new Error("Seleziona un corso");
        const { data } = await supabase
          .from("abbonamenti")
          .select("persona_id")
          .eq("corso", corsoFiltro);
        recipientIds = [...new Set((data || []).map((a) => a.persona_id))];
      } else {
        if (!personaId) throw new Error("Seleziona una persona");
        recipientIds = [personaId];
      }

      if (recipientIds.length === 0) throw new Error("Nessun destinatario trovato");

      // Insert comunicazione
      const { data: com, error: comErr } = await supabase
        .from("comunicazioni")
        .insert({
          oggetto,
          messaggio,
          tipo_destinatari: tipoDestinatari,
          corso_filtro: tipoDestinatari === "corso" ? corsoFiltro : null,
        })
        .select()
        .single();
      if (comErr) throw comErr;

      // Insert destinatari
      const rows = recipientIds.map((pid) => ({
        comunicazione_id: com.id,
        persona_id: pid,
      }));
      const { error: destErr } = await supabase
        .from("comunicazioni_destinatari")
        .insert(rows);
      if (destErr) throw destErr;

      return { count: recipientIds.length };
    },
    onSuccess: (result) => {
      toast.success(`Comunicazione inviata a ${result.count} destinatari`);
      setOggetto("");
      setMessaggio("");
      setTipoDestinatari("tutti");
      setCorsoFiltro("");
      setPersonaId("");
      queryClient.invalidateQueries({ queryKey: ["comunicazioni"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comunicazioni").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comunicazione eliminata");
      queryClient.invalidateQueries({ queryKey: ["comunicazioni"] });
    },
    onError: () => toast.error("Errore durante l'eliminazione"),
  });

  const canSend = oggetto.trim() && messaggio.trim() &&
    (tipoDestinatari === "tutti" || (tipoDestinatari === "corso" && corsoFiltro) || (tipoDestinatari === "singolo" && personaId));

  const labelDestinatari = (c: { tipo_destinatari: string; corso_filtro: string | null }) => {
    if (c.tipo_destinatari === "tutti") return "Tutti i tesserati";
    if (c.tipo_destinatari === "corso") return `Corso: ${c.corso_filtro}`;
    return "Singola persona";
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Comunicazioni
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Invia comunicazioni ai tesserati e consulta lo storico</p>
      </motion.div>

      {/* Send Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-4 w-4" /> Nuova Comunicazione
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Destinatari */}
            <div className="space-y-2">
              <Label>Destinatari</Label>
              <Select value={tipoDestinatari} onValueChange={(v) => setTipoDestinatari(v as TipoDestinatari)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">
                    <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Tutti i tesserati</span>
                  </SelectItem>
                  <SelectItem value="corso">
                    <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" /> Tesserati di un corso</span>
                  </SelectItem>
                  <SelectItem value="singolo">
                    <span className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Singola persona</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoDestinatari === "corso" && (
              <div className="space-y-2">
                <Label>Corso</Label>
                <Select value={corsoFiltro} onValueChange={setCorsoFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona corso" />
                  </SelectTrigger>
                  <SelectContent>
                    {corsi.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tipoDestinatari === "singolo" && (
              <div className="space-y-2">
                <Label>Persona</Label>
                <Select value={personaId} onValueChange={setPersonaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {persone.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.cognome} {p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Oggetto</Label>
              <Input value={oggetto} onChange={(e) => setOggetto(e.target.value)} placeholder="Oggetto della comunicazione" />
            </div>

            <div className="space-y-2">
              <Label>Messaggio</Label>
              <Textarea value={messaggio} onChange={(e) => setMessaggio(e.target.value)} placeholder="Scrivi il messaggio..." rows={5} />
            </div>

            <Button onClick={() => sendMutation.mutate()} disabled={!canSend || sendMutation.isPending} className="w-full sm:w-auto">
              <Send className="h-4 w-4 mr-2" />
              {sendMutation.isPending ? "Invio in corso..." : "Invia Comunicazione"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* History */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Storico Comunicazioni</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Caricamento...</p>
            ) : comunicazioni.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nessuna comunicazione inviata</p>
            ) : (
              <div className="space-y-3">
                {comunicazioni.map((c) => (
                  <div key={c.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{c.oggetto}</span>
                          <Badge variant="secondary" className="text-xs">{labelDestinatari(c)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(c.created_at), "d MMMM yyyy, HH:mm", { locale: it })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        >
                          {expandedId === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(c.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {expandedId === c.id && (
                      <div className="pt-2 border-t space-y-2">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{c.messaggio}</p>
                        {destinatariExpanded.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Destinatari ({destinatariExpanded.length}):</p>
                            <div className="flex flex-wrap gap-1">
                              {destinatariExpanded.map((d) => (
                                <Badge key={d.id} variant="outline" className="text-xs">
                                  {d.cognome} {d.nome}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
