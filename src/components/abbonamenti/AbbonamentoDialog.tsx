import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { CalendarIcon } from "lucide-react";
import { format, parseISO, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

type Abbonamento = Tables<"abbonamenti">;

const TIPO_PAGAMENTO = ["Trimestrale", "Quadrimestrale", "Pagamento unico"] as const;
const STATI = ["Non pagato", "Parziale", "Pagato"];

function getNumeroRate(tipo: string): number {
  switch (tipo) {
    case "Trimestrale": return 3;
    case "Quadrimestrale": return 4;
    case "Pagamento unico": return 1;
    default: return 1;
  }
}

function getIntervalloMesi(tipo: string): number {
  switch (tipo) {
    case "Trimestrale": return 3;
    case "Quadrimestrale": return 4;
    case "Pagamento unico": return 0;
    default: return 0;
  }
}

const schema = z.object({
  persona_id: z.string().min(1, "Seleziona una persona"),
  corso: z.string().min(1, "Corso obbligatorio"),
  stagione: z.string().min(1, "Stagione obbligatoria"),
  stato_pagamento: z.string().min(1, "Stato obbligatorio"),
  importo_totale: z.string().min(1, "Importo obbligatorio").refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Importo non valido"),
  tipo_pagamento: z.string().min(1, "Tipo pagamento obbligatorio"),
  data_inizio: z.string().min(1, "Data inizio obbligatoria"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abbonamento: Abbonamento | null;
  personeMap: Record<string, string>;
  onSave: (data: TablesInsert<"abbonamenti"> & { id?: string; _tipo_pagamento?: string; _data_inizio?: string }) => void;
  isSaving: boolean;
}

export default function AbbonamentoDialog({ open, onOpenChange, abbonamento, personeMap, onSave, isSaving }: Props) {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      persona_id: "", corso: "", stagione: "", stato_pagamento: "Non pagato",
      importo_totale: "0", tipo_pagamento: "Pagamento unico", data_inizio: todayStr,
    },
  });

  useEffect(() => {
    if (open) {
      if (abbonamento) {
        form.reset({
          persona_id: abbonamento.persona_id,
          corso: abbonamento.corso,
          stagione: abbonamento.stagione,
          stato_pagamento: abbonamento.stato_pagamento,
          importo_totale: String(abbonamento.importo_totale),
          tipo_pagamento: (abbonamento as any).tipo_pagamento || "Pagamento unico",
          data_inizio: (abbonamento as any).data_inizio || todayStr,
        });
      } else {
        form.reset({
          persona_id: "", corso: "", stagione: "", stato_pagamento: "Non pagato",
          importo_totale: "0", tipo_pagamento: "Pagamento unico", data_inizio: todayStr,
        });
      }
    }
  }, [open, abbonamento]);

  const tipoPagamento = useWatch({ control: form.control, name: "tipo_pagamento" });
  const importoTotale = useWatch({ control: form.control, name: "importo_totale" });
  const dataInizio = useWatch({ control: form.control, name: "data_inizio" });

  const ratePreview = useMemo(() => {
    const numRate = getNumeroRate(tipoPagamento);
    const totale = Number(importoTotale) || 0;
    const intervallo = getIntervalloMesi(tipoPagamento);
    const importoRata = numRate > 0 ? Math.floor((totale / numRate) * 100) / 100 : 0;
    const resto = Math.round((totale - importoRata * numRate) * 100) / 100;
    const start = dataInizio ? parseISO(dataInizio) : new Date();

    return Array.from({ length: numRate }, (_, i) => ({
      numero: i + 1,
      importo: i === 0 ? importoRata + resto : importoRata,
      scadenza: addMonths(start, i * (intervallo || 0)),
    }));
  }, [tipoPagamento, importoTotale, dataInizio]);

  const onSubmit = (values: FormValues) => {
    const numRate = getNumeroRate(values.tipo_pagamento);
    onSave({
      ...(abbonamento ? { id: abbonamento.id } : {}),
      persona_id: values.persona_id,
      corso: values.corso,
      stagione: values.stagione,
      stato_pagamento: values.stato_pagamento,
      importo_totale: Number(values.importo_totale),
      numero_rate: numRate,
      _tipo_pagamento: values.tipo_pagamento,
      _data_inizio: values.data_inizio,
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
                <FormControl><Input placeholder="Es. Calcio Under 14" {...field} /></FormControl>
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
              <FormField control={form.control} name="stato_pagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stato Pagamento *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {STATI.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="importo_totale" render={({ field }) => (
              <FormItem>
                <FormLabel>Importo Totale (€) *</FormLabel>
                <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tipo_pagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Pagamento *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TIPO_PAGAMENTO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
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

            {/* Rate preview */}
            {ratePreview.length > 0 && Number(importoTotale) > 0 && (
              <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                <p className="text-sm font-medium">
                  Anteprima rate: {ratePreview.length} rat{ratePreview.length === 1 ? "a" : "e"}
                </p>
                <div className="space-y-1">
                  {ratePreview.map((r) => (
                    <div key={r.numero} className="flex justify-between text-sm text-muted-foreground">
                      <span>Rata {r.numero} — {format(r.scadenza, "dd/MM/yyyy")}</span>
                      <span className="font-medium">€{r.importo.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
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
