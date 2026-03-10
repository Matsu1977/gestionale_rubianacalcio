import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { format, parseISO, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

type Abbonamento = Tables<"abbonamenti">;

const FREQUENZE = ["Mensile", "Bimestrale", "Trimestrale", "Quadrimestrale", "Semestrale"] as const;

function getMesiFrequenza(freq: string): number {
  switch (freq) {
    case "Mensile": return 1;
    case "Bimestrale": return 2;
    case "Trimestrale": return 3;
    case "Quadrimestrale": return 4;
    case "Semestrale": return 6;
    default: return 1;
  }
}

const schema = z.object({
  persona_id: z.string().min(1, "Seleziona una persona"),
  corso: z.string().min(1, "Corso obbligatorio"),
  stagione: z.string().min(1, "Stagione obbligatoria"),
  importo_totale: z.string().min(1, "Importo obbligatorio").refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Importo non valido"),
  tipo_pagamento: z.string().min(1, "Frequenza obbligatoria"),
  data_inizio: z.string().min(1, "Data inizio obbligatoria"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abbonamento: Abbonamento | null;
  personeMap: Record<string, string>;
  onSave: (data: TablesInsert<"abbonamenti"> & { id?: string }) => void;
  isSaving: boolean;
}

export default function AbbonamentoDialog({ open, onOpenChange, abbonamento, personeMap, onSave, isSaving }: Props) {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: corsi = [] } = useQuery({
    queryKey: ["corsi-attivi"],
    queryFn: async () => {
      const { data, error } = await supabase.from("corsi").select("id, nome").eq("attivo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      persona_id: "", corso: "", stagione: "",
      importo_totale: "0", tipo_pagamento: "Mensile", data_inizio: todayStr,
    },
  });

  useEffect(() => {
    if (open) {
      if (abbonamento) {
        form.reset({
          persona_id: abbonamento.persona_id,
          corso: abbonamento.corso,
          stagione: abbonamento.stagione,
          importo_totale: String(abbonamento.importo_totale),
          tipo_pagamento: abbonamento.tipo_pagamento || "Mensile",
          data_inizio: abbonamento.data_inizio || todayStr,
        });
      } else {
        form.reset({
          persona_id: "", corso: "", stagione: "",
          importo_totale: "0", tipo_pagamento: "Mensile", data_inizio: todayStr,
        });
      }
    }
  }, [open, abbonamento]);

  const tipoPagamento = useWatch({ control: form.control, name: "tipo_pagamento" });
  const dataInizio = useWatch({ control: form.control, name: "data_inizio" });

  const prossimaScadenza = useMemo(() => {
    if (!dataInizio) return null;
    const mesi = getMesiFrequenza(tipoPagamento);
    const start = parseISO(dataInizio);
    return addMonths(start, mesi);
  }, [tipoPagamento, dataInizio]);

  const onSubmit = (values: FormValues) => {
    onSave({
      ...(abbonamento ? { id: abbonamento.id } : {}),
      persona_id: values.persona_id,
      corso: values.corso,
      stagione: values.stagione,
      stato_pagamento: abbonamento?.stato_pagamento || "Non pagato",
      importo_totale: Number(values.importo_totale),
      numero_rate: 1,
      tipo_pagamento: values.tipo_pagamento,
      data_inizio: values.data_inizio,
    } as any);
  };

  const personeList = Object.entries(personeMap).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{abbonamento ? "Modifica Abbonamento" : "Nuovo Abbonamento"}</DialogTitle>
          <DialogDescription>{abbonamento ? "Modifica i dati dell'abbonamento" : "Inserisci i dati del nuovo abbonamento"}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="persona_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Persona *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Seleziona persona" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {personeList.map(([id, nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="corso" render={({ field }) => (
              <FormItem>
                <FormLabel>Corso *</FormLabel>
                {corsi.length > 0 ? (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleziona corso" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {corsi.map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl><Input placeholder="Es. Calcio Under 14" {...field} /></FormControl>
                )}
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="stagione" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stagione *</FormLabel>
                  <FormControl><Input placeholder="2025/2026" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tipo_pagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequenza Scadenza *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {FREQUENZE.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="importo_totale" render={({ field }) => (
                <FormItem>
                  <FormLabel>Importo (€) *</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_inizio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Inizio *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(parseISO(field.value), "dd/MM/yyyy") : "Seleziona"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? parseISO(field.value) : undefined}
                        onSelect={(date) => { if (date) field.onChange(format(date, "yyyy-MM-dd")); }}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Scadenza preview */}
            {prossimaScadenza && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Prossima scadenza: <strong>{format(prossimaScadenza, "dd/MM/yyyy")}</strong></span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Salvataggio..." : "Salva"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
