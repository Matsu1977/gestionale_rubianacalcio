import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, ShieldCheck, ShieldX, Minus, Plus, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { format, parseISO, isBefore, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function IstruttoreDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nuovaSessioneDialog, setNuovaSessioneDialog] = useState<string | null>(null); // corso_id
  const [nuovaData, setNuovaData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [nuoveNote, setNuoveNote] = useState("");
  const [sessioneAperta, setSessioneAperta] = useState<string | null>(null); // sessione_id

  // Persona collegata all'utente loggato
  const { data: persona } = useQuery({
    queryKey: ["istruttore-persona", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("persone").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  // Corsi insegnati dall'istruttore
  const { data: corsiInsegnati = [] } = useQuery({
    queryKey: ["istruttore-corsi", persona?.id],
    enabled: !!persona,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("istruttore_corsi")
        .select("corso:corsi(id, nome)")
        .eq("persona_id", persona!.id);
      if (error) throw error;
      return (data || []).map((ic: any) => ic.corso).filter(Boolean);
    },
  });

  const corsoIds = corsiInsegnati.map((c: any) => c.id);

  // Iscritti ai corsi dell'istruttore
  const { data: iscritti = [] } = useQuery({
    queryKey: ["istruttore-iscritti", corsoIds.join(",")],
    enabled: corsoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("persona_corsi")
        .select("corso_id, persona:persone(id, nome, cognome, certificato_medico_scadenza)")
        .in("corso_id", corsoIds);
      if (error) throw error;
      return data || [];
    },
  });

  // Sessioni per i corsi dell'istruttore
  const { data: sessioni = [] } = useQuery({
    queryKey: ["istruttore-sessioni", corsoIds.join(",")],
    enabled: corsoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessioni_allenamento")
        .select("*")
        .in("corso_id", corsoIds)
        .order("data", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Presenze per la sessione aperta
  const { data: presenze = [] } = useQuery({
    queryKey: ["istruttore-presenze", sessioneAperta],
    enabled: !!sessioneAperta,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presenze")
        .select("*")
        .eq("sessione_id", sessioneAperta!);
      if (error) throw error;
      return data || [];
    },
  });

  const creaSessioneMutation = useMutation({
    mutationFn: async ({ corsoId, data, note }: { corsoId: string; data: string; note: string }) => {
      const corso = corsiInsegnati.find((c: any) => c.id === corsoId);
      const { data: newSessione, error } = await supabase
        .from("sessioni_allenamento")
        .insert({ corso_id: corsoId, corso: corso?.nome || "", data, note: note || null })
        .select()
        .single();
      if (error) throw error;

      // Crea presenze per tutti gli iscritti al corso (default: assente)
      const iscrittiCorso = iscritti
        .filter((i: any) => i.corso_id === corsoId)
        .map((i: any) => i.persona)
        .filter(Boolean);

      if (iscrittiCorso.length > 0) {
        await supabase.from("presenze").insert(
          iscrittiCorso.map((p: any) => ({
            sessione_id: newSessione.id,
            persona_id: p.id,
            presente: false,
          }))
        );
      }
      return newSessione;
    },
    onSuccess: (newSessione) => {
      queryClient.invalidateQueries({ queryKey: ["istruttore-sessioni"] });
      toast.success("Sessione creata");
      setNuovaSessioneDialog(null);
      setNuovaData(format(new Date(), "yyyy-MM-dd"));
      setNuoveNote("");
      setSessioneAperta(newSessione.id);
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });

  const togglePresenzaMutation = useMutation({
    mutationFn: async ({ presenzaId, presente }: { presenzaId: string; presente: boolean }) => {
      const { error } = await supabase
        .from("presenze")
        .update({ presente })
        .eq("id", presenzaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["istruttore-presenze", sessioneAperta] });
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });

  if (!persona) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Area Istruttore</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Il tuo account non è ancora collegato a un profilo. Contatta la segreteria.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date();
  const warningDate = addDays(today, 30);

  const allPersone = iscritti.map((i: any) => i.persona).filter(Boolean);
  const certAlert = allPersone.filter((p: any) => {
    if (!p.certificato_medico_scadenza) return false;
    return isBefore(parseISO(p.certificato_medico_scadenza), warningDate);
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Area Istruttore</h1>
        <p className="text-muted-foreground mt-1">Benvenuto, {persona.nome} {persona.cognome}</p>
      </div>

      <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">

        {/* Alert certificati */}
        {certAlert.length > 0 && (
          <motion.div variants={item}>
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                  <ShieldX className="h-5 w-5" />
                  Certificati Medici in scadenza o scaduti ({certAlert.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {certAlert.map((p: any) => {
                  const scaduto = isBefore(parseISO(p.certificato_medico_scadenza), today);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-background text-sm">
                      <span className="font-medium">{p.cognome} {p.nome}</span>
                      <Badge variant={scaduto ? "destructive" : "outline"} className={!scaduto ? "border-amber-500 text-amber-700" : ""}>
                        {scaduto ? "Scaduto" : "In scadenza"} · {format(parseISO(p.certificato_medico_scadenza), "dd/MM/yyyy")}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs per corso */}
        {corsiInsegnati.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-sm">Nessun corso assegnato. Contatta la segreteria.</p>
            </CardContent>
          </Card>
        ) : (
          <motion.div variants={item}>
            <Tabs defaultValue={corsiInsegnati[0]?.id}>
              <TabsList className="mb-4">
                {corsiInsegnati.map((corso: any) => (
                  <TabsTrigger key={corso.id} value={corso.id}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    {corso.nome}
                  </TabsTrigger>
                ))}
              </TabsList>

              {corsiInsegnati.map((corso: any) => {
                const iscrittiCorso = iscritti
                  .filter((i: any) => i.corso_id === corso.id)
                  .map((i: any) => i.persona)
                  .filter(Boolean);

                const sessioniCorso = sessioni.filter((s: any) => s.corso_id === corso.id);

                return (
                  <TabsContent key={corso.id} value={corso.id} className="space-y-4">

                    {/* Iscritti */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          Iscritti
                          <Badge variant="outline">{iscrittiCorso.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {iscrittiCorso.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nessun iscritto</p>
                        ) : (
                          iscrittiCorso.map((p: any) => {
                            const certScadenza = p.certificato_medico_scadenza;
                            const scaduto = certScadenza ? isBefore(parseISO(certScadenza), today) : null;
                            const inScadenza = certScadenza ? isBefore(parseISO(certScadenza), warningDate) : null;
                            return (
                              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                                <span className="font-medium">{p.cognome} {p.nome}</span>
                                {certScadenza === null ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-4 w-4" /> N/D</span>
                                ) : scaduto ? (
                                  <Badge variant="destructive" className="text-xs">Scaduto · {format(parseISO(certScadenza), "dd/MM/yyyy")}</Badge>
                                ) : inScadenza ? (
                                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-700">In scadenza · {format(parseISO(certScadenza), "dd/MM/yyyy")}</Badge>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-green-600"><ShieldCheck className="h-4 w-4" /> {format(parseISO(certScadenza), "dd/MM/yyyy")}</span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </CardContent>
                    </Card>

                    {/* Sessioni */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            Sessioni
                            <Badge variant="outline">{sessioniCorso.length}</Badge>
                          </CardTitle>
                          <Button size="sm" onClick={() => setNuovaSessioneDialog(corso.id)}>
                            <Plus className="h-4 w-4 mr-1" /> Nuova sessione
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {sessioniCorso.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nessuna sessione registrata.</p>
                        ) : (
                          sessioniCorso.map((s: any) => {
                            const isOpen = sessioneAperta === s.id;
                            const presenzeSessione = presenze.filter((p: any) => p.sessione_id === s.id);
                            const presentiCount = presenzeSessione.filter((p: any) => p.presente).length;

                            return (
                              <div key={s.id} className="rounded-lg border">
                                <button
                                  className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50 transition-colors"
                                  onClick={() => setSessioneAperta(isOpen ? null : s.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{format(parseISO(s.data), "dd/MM/yyyy")}</span>
                                    {s.note && <span className="text-muted-foreground text-xs">{s.note}</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {presentiCount}/{iscrittiCorso.length} presenti
                                    </Badge>
                                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </div>
                                </button>

                                {isOpen && (
                                  <div className="border-t p-3 space-y-2">
                                    {iscrittiCorso.map((p: any) => {
                                      const presenza = presenzeSessione.find((pr: any) => pr.persona_id === p.id);
                                      return (
                                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                                          <Checkbox
                                            checked={presenza?.presente || false}
                                            onCheckedChange={(checked) => {
                                              if (presenza) {
                                                togglePresenzaMutation.mutate({ presenzaId: presenza.id, presente: !!checked });
                                              }
                                            }}
                                            disabled={!presenza || togglePresenzaMutation.isPending}
                                          />
                                          <span className="text-sm font-medium">{p.cognome} {p.nome}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </motion.div>
        )}
      </motion.div>

      {/* Dialog nuova sessione */}
      <Dialog open={!!nuovaSessioneDialog} onOpenChange={(open) => { if (!open) setNuovaSessioneDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova Sessione</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={nuovaData} onChange={(e) => setNuovaData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input value={nuoveNote} onChange={(e) => setNuoveNote(e.target.value)} placeholder="Opzionale" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNuovaSessioneDialog(null)}>Annulla</Button>
            <Button
              onClick={() => nuovaSessioneDialog && creaSessioneMutation.mutate({ corsoId: nuovaSessioneDialog, data: nuovaData, note: nuoveNote })}
              disabled={creaSessioneMutation.isPending || !nuovaData}
            >
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
