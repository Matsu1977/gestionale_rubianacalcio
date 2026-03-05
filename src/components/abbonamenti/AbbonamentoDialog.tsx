import { useEffect } from "react";
import { useForm } from "react-hook-form";
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

type Abbonamento = Tables<"abbonamenti">;

const STATI = ["Non pagato", "Parziale", "Pagato"];

const schema = z.object({
  persona_id: z.string().min(1, "Seleziona una persona"),
  corso: z.string().min(1, "Corso obbligatorio"),
  stagione: z.string().min(1, "Stagione obbligatoria"),
  stato_pagamento: z.string().min(1, "Stato obbligatorio"),
  importo_totale: z.string().min(1, "Importo obbligatorio").refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Importo non valido"),
  numero_rate: z.string().min(1, "Numero rate obbligatorio").refine((v) => !isNaN(Number(v)) && Number(v) >= 1, "Min 1 rata"),
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
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { persona_id: "", corso: "", stagione: "", stato_pagamento: "Non pagato", importo_totale: "0", numero_rate: "1" },
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
          numero_rate: String(abbonamento.numero_rate),
        });
      } else {
        form.reset({ persona_id: "", corso: "", stagione: "", stato_pagamento: "Non pagato", importo_totale: "0", numero_rate: "1" });
      }
    }
  }, [open, abbonamento]);

  const onSubmit = (values: FormValues) => {
    onSave({
      ...(abbonamento ? { id: abbonamento.id } : {}),
      persona_id: values.persona_id,
      corso: values.corso,
      stagione: values.stagione,
      stato_pagamento: values.stato_pagamento,
      importo_totale: Number(values.importo_totale),
      numero_rate: Number(values.numero_rate),
    });
  };

  const personeList = Object.entries(personeMap).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="importo_totale" render={({ field }) => (
                <FormItem>
                  <FormLabel>Importo Totale (€) *</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="numero_rate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero Rate *</FormLabel>
                  <FormControl><Input type="number" min="1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
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
