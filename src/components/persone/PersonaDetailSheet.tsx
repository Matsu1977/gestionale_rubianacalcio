import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Receipt, FileSignature, Mail, Loader2, Users, Plus, X, BookOpen } from "lucide-react";
import { toast } from "sonner";
import DocumentoFirmaDialog from "./DocumentoFirmaDialog";
import DocumentiList from "./DocumentiList";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type Persona = Tables<"persone">;
type TipoRuolo = Database["public"]["Enums"]["tipo_ruolo"];

const RUOLO_COLORS: Record<TipoRuolo, string> = {
  Dirigente: "bg-primary/15 text-primary border-primary/30",
  Socio: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  Abbonato: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Atleta: "bg-green-500/15 text-green-700 border-green-500/30",
  Allenatore: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  Genitore: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

interface HistoryRow {
  id: string;
  data: string;
  tipo: string;
  categoria: string;
  importo: number;
  metodo: string;
  stato: string;
  source: "movimento" | "abbonamento" | "tesseramento";
}

interface Props {
  persona: Persona | null;
  ruoli: TipoRuolo[];
  onClose: () => void;
}

export default function PersonaDetailSheet({ persona, ruoli, onClose }: Props) {
  const queryClient = useQueryClient();
  const [firmaOpen, setFirmaOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [showFamiliareDialog, setShowFamiliareDialog] = useState(false);
  const [selectedFiglio, setSelectedFiglio] = useState("");
  const [relazioneType, setRelazioneType] = useState("Genitore");

  // Corsi disponibili (solo attivi)
  const { data: tuttiCorsi = [] } = useQuery({
    queryKey: ["corsi"],
    queryFn: async () => {
      const { data, error } = await supabase.from("corsi").select("*").eq("attivo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Corsi iscritti per questa persona
  const { data: personaCorsi = [] } = useQuery({
    queryKey: ["persona_corsi", persona?.id],
    enabled: !!persona,
    queryFn: async () => {
      const { data, error } = await supabase.from("persona_corsi").select("*").eq("persona_id", persona!.id);
      if (error) throw error;
      return data;
    },
  });

  const corsiIscritti = new Set(personaCorsi.map((pc: any) => pc.corso_id));

  const toggleCorsoMutation = useMutation({
    mutationFn: async ({ corsoId, iscritto }: { corsoId: string; iscritto: boolean }) => {
      if (iscritto) {
        const { error } = await supabase.from("persona_corsi").delete()
          .eq("persona_id", persona!.id).eq("corso_id", corsoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("persona_corsi").insert({
          persona_id: persona!.id,
          corso_id: corsoId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persona_corsi", persona?.id] });
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });

  const { data: movimenti = [] } = useQuery({
    queryKey: ["movimenti", persona?.id],
    enabled: !!persona,
    queryFn: async () => {
      const { data, error } = await supabase.from("movimenti").select("*").eq("persona_id", persona!.id).order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: abbonamenti = [] } = useQuery({
    queryKey: ["abbonamenti-persona", persona?.id],
    enabled: !!persona,
    queryFn: async () => {
      const { data, error } = await supabase.from("abbonamenti").select("*").eq("persona_id", persona!.id).order("data_inizio", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tesseramenti = [] } = useQuery({
    queryKey: ["tesseramenti-persona", persona?.id],
    enabled: !!persona,
    queryFn: async () => {
      const { data, error } = await supabase.from("tesseramenti").select("*").eq("persona_id", persona!.id).order("data_inizio", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: familiari = [] } = useQuery({
    queryKey: ["familiari", persona?.id],
    enabled: !!persona,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("familiari")
        .select("*, figlio:persone!familiari_figlio_id_fkey(id, nome, cognome, data_nascita)")
        .eq("genitore_id", persona!.id);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tuttePersone = [] } = useQuery({
    queryKey: ["persone-for-familiari"],
    enabled: showFamiliareDialog,
    queryFn: async () => {
      const { data } = await supabase.from("persone").select("id, nome, cognome").order("cognome");
      return data || [];
    },
  });

  const aggiungiFamiliareMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("familiari").insert({
        genitore_id: persona!.id,
        figlio_id: selectedFiglio,
        relazione: relazioneType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familiari", persona?.id] });
      toast.success("Familiare collegato");
      setShowFamiliareDialog(false);
      setSelectedFiglio("");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });

  const rimuoviFamiliareMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("familiari").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familiari", persona?.id] });
      toast.success("Familiare rimosso");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });

  const allHistory = useMemo<HistoryRow[]>(() => {
    const rows: HistoryRow[] = [];
    for (const m of movimenti) {
      rows.push({ id: m.id, data: m.data, tipo: m.tipo, categoria: m.categoria, importo: Number(m.importo), metodo: m.metodo_pagamento, stato: "Pagato", source: "movimento" });
    }
    for (const a of abbonamenti) {
      rows.push({ id: a.id, data: a.data_inizio, tipo: "Abbonamento", categoria: `${a.corso} – ${a.stagione}`, importo: Number(a.importo_totale), metodo: a.tipo_pagamento, stato: a.stato_pagamento, source: "abbonamento" });
    }
    for (const t of tesseramenti) {
      rows.push({ id: t.id, data: t.data_inizio, tipo: "Tesseramento", categoria: `${t.tipo_tesseramento} – ${t.stagione}`, importo: Number(t.importo), metodo: (t as any).metodo_pagamento || "—", stato: t.stato, source: "tesseramento" });
    }
    rows.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return rows;
  }, [movimenti, abbonamenti, tesseramenti]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("movimenti").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimenti", persona?.id] });
      toast.success("Pagamento eliminato");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const totaleMovimenti = movimenti.reduce((sum, m) => sum + Number(m.importo), 0);

  const handleInvite = async () => {
    if (!persona?.email) return;
    setInviting(true);
    try {
      const { error } = await supabase.functions.invoke("invite-user", {
        body: { email: persona.email, persona_id: persona.id, role: "atleta" },
      });
      if (error) throw error;
      toast.success("Invito inviato a " + persona.email);
    } catch (err: any) {
      toast.error("Errore: " + err.message);
    } finally {
      setInviting(false);
    }
  };

  if (!persona) return null;

  const statoBadge = (stato: string) => {
    const map: Record<string, string> = {
      Pagato: "bg-green-500/15 text-green-700 border-green-500/30",
      "Pagato totale": "bg-green-500/15 text-green-700 border-green-500/30",
      Attivo: "bg-green-500/15 text-green-700 border-green-500/30",
      "Non pagato": "bg-red-500/15 text-red-700 border-red-500/30",
      Scaduto: "bg-red-500/15 text-red-700 border-red-500/30",
      "Pagato parziale": "bg-amber-500/15 text-amber-700 border-amber-500/30",
    };
    return map[stato] || "bg-muted text-muted-foreground";
  };

  const renderHistoryTable = (rows: HistoryRow[], showDelete = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="hidden sm:table-cell">Dettaglio</TableHead>
          <TableHead>Metodo</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead className="text-right">Importo</TableHead>
          {showDelete && <TableHead className="w-10"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={`${r.source}-${r.id}`}>
            <TableCell className="text-xs">{new Date(r.data).toLocaleDateString("it-IT")}</TableCell>
            <TableCell className="text-xs font-medium">{r.tipo}</TableCell>
            <TableCell className="text-xs hidden sm:table-cell">{r.categoria}</TableCell>
            <TableCell className="text-xs">{r.metodo}</TableCell>
            <TableCell><Badge variant="outline" className={`text-[10px] ${statoBadge(r.stato)}`}>{r.stato}</Badge></TableCell>
            <TableCell className="text-right font-medium text-xs">€{r.importo.toFixed(2)}</TableCell>
            {showDelete && (
              <TableCell>
                {r.source === "movimento" ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(r.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                ) : <span />}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const movimentiRows = allHistory.filter((r) => r.source === "movimento");
  const abbonamentiRows = allHistory.filter((r) => r.source === "abbonamento");
  const tesseramentiRows = allHistory.filter((r) => r.source === "tesseramento");

  return (
    <>
      <Sheet open={!!persona} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{persona.cognome} {persona.nome}</SheetTitle>
            <SheetDescription>Dettaglio persona e storico pagamenti</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {persona.codice_fiscale && <div><span className="text-muted-foreground">CF:</span> <span className="font-medium uppercase">{persona.codice_fiscale}</span></div>}
              {persona.data_nascita && <div><span className="text-muted-foreground">Nascita:</span> <span className="font-medium">{new Date(persona.data_nascita).toLocaleDateString("it-IT")}</span></div>}
              {persona.telefono && <div><span className="text-muted-foreground">Tel:</span> <span className="font-medium">{persona.telefono}</span></div>}
              {persona.email && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{persona.email}</span>
                  {!persona.user_id && (
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={handleInvite} disabled={inviting}>
                      {inviting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
                      {inviting ? "Invio..." : "Invita"}
                    </Button>
                  )}
                </div>
              )}
              {persona.certificato_medico_scadenza && <div className="col-span-2"><span className="text-muted-foreground">Cert. Medico:</span> <span className="font-medium">{new Date(persona.certificato_medico_scadenza).toLocaleDateString("it-IT")}</span></div>}
            </div>

            {/* Ruoli */}
            {ruoli.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {ruoli.map((r) => (
                  <Badge key={r} variant="outline" className={RUOLO_COLORS[r]}>{r}</Badge>
                ))}
              </div>
            )}

            <Separator />

            {/* Familiari */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Familiari / Figli</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowFamiliareDialog(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Aggiungi
                </Button>
              </div>
              {familiari.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun familiare collegato</p>
              ) : (
                <div className="space-y-2">
                  {familiari.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                      <div>
                        <span className="font-medium">{f.figlio?.cognome} {f.figlio?.nome}</span>
                        {f.figlio?.data_nascita && (
                          <span className="text-muted-foreground text-xs ml-2">
                            (nato il {new Date(f.figlio.data_nascita).toLocaleDateString("it-IT")})
                          </span>
                        )}
                        <Badge variant="outline" className="ml-2 text-[10px]">{f.relazione}</Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => rimuoviFamiliareMutation.mutate(f.id)}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Corsi */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Corsi iscritti</h3>
              </div>
              {tuttiCorsi.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun corso attivo. Creane uno in Impostazioni.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tuttiCorsi.map((corso: any) => {
                    const iscritto = corsiIscritti.has(corso.id);
                    return (
                      <div key={corso.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id={`corso-${corso.id}`}
                          checked={iscritto}
                          onCheckedChange={() =>
                            toggleCorsoMutation.mutate({ corsoId: corso.id, iscritto })
                          }
                          disabled={toggleCorsoMutation.isPending}
                        />
                        <label
                          htmlFor={`corso-${corso.id}`}
                          className="text-sm font-medium cursor-pointer select-none flex-1"
                        >
                          {corso.nome}
                          {corso.descrizione && (
                            <span className="text-muted-foreground text-xs block font-normal">{corso.descrizione}</span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Storico Pagamenti */}
            <div>
              <h3 className="font-semibold">Storico Pagamenti</h3>
              <p className="text-sm text-muted-foreground">
                {allHistory.length} moviment{allHistory.length === 1 ? "o" : "i"} · Totale movimenti: €{totaleMovimenti.toFixed(2)}
              </p>
            </div>

            {allHistory.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2" />
                <p className="text-sm">Nessun pagamento registrato</p>
              </div>
            ) : (
              <Tabs defaultValue="tutti" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="tutti" className="flex-1">Tutti ({allHistory.length})</TabsTrigger>
                  <TabsTrigger value="movimenti" className="flex-1">Movimenti ({movimentiRows.length})</TabsTrigger>
                  <TabsTrigger value="abbonamenti" className="flex-1">Abbonamenti ({abbonamentiRows.length})</TabsTrigger>
                  <TabsTrigger value="tesseramenti" className="flex-1">Tesseramenti ({tesseramentiRows.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="tutti">{renderHistoryTable(allHistory, true)}</TabsContent>
                <TabsContent value="movimenti">{movimentiRows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nessun movimento</p> : renderHistoryTable(movimentiRows, true)}</TabsContent>
                <TabsContent value="abbonamenti">{abbonamentiRows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nessun abbonamento</p> : renderHistoryTable(abbonamentiRows)}</TabsContent>
                <TabsContent value="tesseramenti">{tesseramentiRows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nessun tesseramento</p> : renderHistoryTable(tesseramentiRows)}</TabsContent>
              </Tabs>
            )}

            <Separator />

            {/* Documenti Firmati */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Documenti Firmati</h3>
                <p className="text-sm text-muted-foreground">Moduli firmati digitalmente</p>
              </div>
              <Button size="sm" onClick={() => setFirmaOpen(true)}>
                <FileSignature className="h-4 w-4 mr-1" /> Genera e firma
              </Button>
            </div>

            <DocumentiList personaId={persona.id} />
          </div>
        </SheetContent>
      </Sheet>

      <DocumentoFirmaDialog open={firmaOpen} onOpenChange={setFirmaOpen} persona={persona} />

      {/* Dialog Aggiungi Familiare */}
      <Dialog open={showFamiliareDialog} onOpenChange={setShowFamiliareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collega familiare</DialogTitle>
            <DialogDescription>Seleziona la persona da collegare come figlio/a di {persona.nome} {persona.cognome}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Figlio/a</Label>
              <Select value={selectedFiglio} onValueChange={setSelectedFiglio}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona persona..." />
                </SelectTrigger>
                <SelectContent>
                  {tuttePersone.filter((p: any) => p.id !== persona.id).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.cognome} {p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Relazione</Label>
              <Select value={relazioneType} onValueChange={setRelazioneType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Genitore">Genitore</SelectItem>
                  <SelectItem value="Tutore">Tutore legale</SelectItem>
                  <SelectItem value="Nonno/a">Nonno/a</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFamiliareDialog(false)}>Annulla</Button>
            <Button onClick={() => aggiungiFamiliareMutation.mutate()} disabled={!selectedFiglio || aggiungiFamiliareMutation.isPending}>
              {aggiungiFamiliareMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Collega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}