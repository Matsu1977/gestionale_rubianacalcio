import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PagamentoDialog from "./PagamentoDialog";

type Persona = Tables<"persone">;
type TipoRuolo = Database["public"]["Enums"]["tipo_ruolo"];
type CategoriaMov = Database["public"]["Enums"]["categoria_movimento"];
type MetodoPag = Database["public"]["Enums"]["metodo_pagamento"];

const RUOLO_COLORS: Record<TipoRuolo, string> = {
  Dirigente: "bg-primary/15 text-primary border-primary/30",
  Socio: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  Abbonato: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Atleta: "bg-green-500/15 text-green-700 border-green-500/30",
  Allenatore: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  Genitore: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

interface Props {
  persona: Persona | null;
  ruoli: TipoRuolo[];
  onClose: () => void;
}

export default function PersonaDetailSheet({ persona, ruoli, onClose }: Props) {
  const queryClient = useQueryClient();
  const [pagamentoOpen, setPagamentoOpen] = useState(false);

  const { data: movimenti = [] } = useQuery({
    queryKey: ["movimenti", persona?.id],
    enabled: !!persona,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti")
        .select("*")
        .eq("persona_id", persona!.id)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (payload: { data: string; categoria: CategoriaMov; importo: number; metodo_pagamento: MetodoPag; note: string | null }) => {
      const { error } = await supabase.from("movimenti").insert({
        ...payload,
        tipo: "Entrata" as const,
        persona_id: persona!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimenti", persona?.id] });
      toast.success("Pagamento registrato");
      setPagamentoOpen(false);
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

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

  const totale = movimenti.reduce((sum, m) => sum + Number(m.importo), 0);

  if (!persona) return null;

  return (
    <>
      <Sheet open={!!persona} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
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
              {persona.email && <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{persona.email}</span></div>}
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

            {/* Pagamenti */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Storico Pagamenti</h3>
                <p className="text-sm text-muted-foreground">Totale: €{totale.toFixed(2)}</p>
              </div>
              <Button size="sm" onClick={() => setPagamentoOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Movimento generico
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">I pagamenti degli abbonamenti si gestiscono dalla sezione Abbonamenti tramite il piano rate.</p>

            {movimenti.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2" />
                <p className="text-sm">Nessun pagamento registrato</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Metodo</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimenti.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{new Date(m.data).toLocaleDateString("it-IT")}</TableCell>
                      <TableCell className="text-xs">{m.categoria}</TableCell>
                      <TableCell className="text-xs">{m.metodo_pagamento}</TableCell>
                      <TableCell className="text-right font-medium text-xs">€{Number(m.importo).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(m.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <PagamentoDialog
        open={pagamentoOpen}
        onOpenChange={setPagamentoOpen}
        personaNome={`${persona.nome} ${persona.cognome}`}
        onSave={(data) => addMutation.mutate(data)}
        isSaving={addMutation.isPending}
      />
    </>
  );
}
