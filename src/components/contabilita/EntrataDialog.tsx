import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

type MetodoPag = Database["public"]["Enums"]["metodo_pagamento"];

const METODI: MetodoPag[] = ["Contanti", "Bonifico", "Carta", "Satispay", "Altro"];

// Categorie speciali che permettono il collegamento a un servizio
const CAT_ABBONAMENTO = "Abbonamento";
const CAT_TESSERA = "Tessera ingressi";
const CAT_TESSERAMENTO = "Tesseramento";
const CAT_QUOTA = "Quota associativa";

const schema = z.object({
  data: z.string().min(1, "Data obbligatoria"),
  importo: z.string().min(1, "Importo obbligatorio").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Importo deve essere maggiore di 0"),
  categoria_entrata: z.string().min(1, "Categoria obbligatoria"),
  descrizione: z.string().max(500).optional().or(z.literal("")),
  metodo_pagamento: z.enum(["Contanti", "Bonifico", "Carta", "Satispay", "Altro"], { required_error: "Seleziona metodo" }),
  persona_id: z.string().optional().or(z.literal("")),
  servizio_id: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export interface EntrataPayload {
  data: string;
  importo: number;
  categoria_entrata: string;
  descrizione: string;
  metodo_pagamento: MetodoPag;
  persona_id: string | null;
  persona_label: string | null;
  riferimento_tipo: string | null;
  riferimento_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EntrataPayload) => void;
  isSaving: boolean;
}

export default function EntrataDialog({ open, onOpenChange, onSave, isSaving }: Props) {
  const { data: categorie = [] } = useQuery({
    queryKey: ["categorie-spesa", "Entrata"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorie_spesa")
        .select("nome")
        .eq("tipo", "Entrata")
        .order("nome");
      if (error) throw error;
      return data.map((c) => c.nome);
    },
  });

  const { data: persone = [] } = useQuery({
    queryKey: ["persone-entrata-dialog"],
    queryFn: async () => {
      const { data } = await supabase.from("persone").select("id, nome, cognome").order("cognome");
      return data || [];
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      data: new Date().toISOString().split("T")[0],
      importo: "",
      categoria_entrata: "",
      descrizione: "",
      metodo_pagamento: undefined,
      persona_id: "",
      servizio_id: "",
    },
  });

  const personaId = form.watch("persona_id");
  const categoriaEntrata = form.watch("categoria_entrata");

  // Reset servizio quando cambiano persona o categoria
  useEffect(() => {
    form.setValue("servizio_id", "");
  }, [personaId, categoriaEntrata, form]);

  // Carica abbonamenti dell'atleta
  const { data: abbonamenti = [] } = useQuery({
    queryKey: ["abbonamenti-persona", personaId],
    queryFn: async () => {
      if (!personaId) return [];
      const { data } = await supabase
        .from("abbonamenti")
        .select("id, corso, stagione, importo_totale, data_inizio")
        .eq("persona_id", personaId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!personaId && categoriaEntrata === CAT_ABBONAMENTO,
  });

  // Carica tessere ingressi dell'atleta
  const { data: tessere = [] } = useQuery({
    queryKey: ["tessere-persona-entrata", personaId],
    queryFn: async () => {
      if (!personaId) return [];
      const { data } = await supabase
        .from("tessere_ingressi")
        .select("id, corso, importo, ingressi_totali, ingressi_usati, data_acquisto")
        .eq("persona_id", personaId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!personaId && categoriaEntrata === CAT_TESSERA,
  });

  // Carica tesseramenti / quota associativa
  const { data: tesseramenti = [] } = useQuery({
    queryKey: ["tesseramenti-persona-entrata", personaId],
    queryFn: async () => {
      if (!personaId) return [];
      const { data } = await supabase
        .from("tesseramenti")
        .select("id, stagione, tipo_tesseramento, importo")
        .eq("persona_id", personaId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!personaId && (categoriaEntrata === CAT_TESSERAMENTO || categoriaEntrata === CAT_QUOTA),
  });

  const personeMap = useMemo(() => {
    const m: Record<string, string> = {};
    persone.forEach((p: any) => { m[p.id] = `${p.cognome} ${p.nome}`; });
    return m;
  }, [persone]);

  const showServizioField = !!personaId && (
    categoriaEntrata === CAT_ABBONAMENTO ||
    categoriaEntrata === CAT_TESSERA ||
    categoriaEntrata === CAT_TESSERAMENTO ||
    categoriaEntrata === CAT_QUOTA
  );

  const onSubmit = (values: FormValues) => {
    let riferimento_tipo: string | null = null;
    let riferimento_id: string | null = null;

    if (values.servizio_id) {
      if (categoriaEntrata === CAT_ABBONAMENTO) riferimento_tipo = "abbonamento";
      else if (categoriaEntrata === CAT_TESSERA) riferimento_tipo = "tessera_ingressi";
      else if (categoriaEntrata === CAT_TESSERAMENTO || categoriaEntrata === CAT_QUOTA) riferimento_tipo = "tesseramento";
      riferimento_id = values.servizio_id;
    }

    onSave({
      data: values.data,
      importo: Number(values.importo),
      categoria_entrata: values.categoria_entrata,
      descrizione: values.descrizione || "",
      metodo_pagamento: values.metodo_pagamento,
      persona_id: values.persona_id || null,
      persona_label: values.persona_id ? personeMap[values.persona_id] || null : null,
      riferimento_tipo,
      riferimento_id,
    });

    form.reset({
      data: new Date().toISOString().split("T")[0],
      importo: "",
      categoria_entrata: "",
      descrizione: "",
      metodo_pagamento: undefined,
      persona_id: "",
      servizio_id: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova Entrata</DialogTitle>
          <DialogDescription>Registra una nuova entrata, eventualmente collegata a un servizio</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="data" render={({ field }) => (
              <FormItem>
                <FormLabel>Data *</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="persona_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Persona</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleziona persona (opzionale)" /></SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72">
                    {persone.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.cognome} {p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Necessaria per collegare il pagamento a un abbonamento o tessera.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="categoria_entrata" render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleziona categoria" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categorie.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {showServizioField && (
              <FormField control={form.control} name="servizio_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {categoriaEntrata === CAT_ABBONAMENTO && "Abbonamento collegato"}
                    {categoriaEntrata === CAT_TESSERA && "Tessera collegata"}
                    {(categoriaEntrata === CAT_TESSERAMENTO || categoriaEntrata === CAT_QUOTA) && "Tesseramento collegato"}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleziona il servizio" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoriaEntrata === CAT_ABBONAMENTO && abbonamenti.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.corso} — {a.stagione} (€{Number(a.importo_totale).toFixed(2)})
                        </SelectItem>
                      ))}
                      {categoriaEntrata === CAT_TESSERA && tessere.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.corso} — {format(new Date(t.data_acquisto), "dd/MM/yyyy")} — {t.ingressi_totali - t.ingressi_usati}/{t.ingressi_totali}
                        </SelectItem>
                      ))}
                      {(categoriaEntrata === CAT_TESSERAMENTO || categoriaEntrata === CAT_QUOTA) && tesseramenti.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.tipo_tesseramento} — {t.stagione} (€{Number(t.importo).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Il pagamento sarà collegato direttamente al servizio (no campo note).</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="importo" render={({ field }) => (
              <FormItem>
                <FormLabel>Importo (€) *</FormLabel>
                <FormControl><Input type="number" step="0.01" min="0.01" placeholder="0.00" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="metodo_pagamento" render={({ field }) => (
              <FormItem>
                <FormLabel>Metodo di Pagamento *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleziona metodo" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {METODI.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="descrizione" render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Note aggiuntive (non usate per il collegamento)" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvataggio..." : "Registra entrata"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
