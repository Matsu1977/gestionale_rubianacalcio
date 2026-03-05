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

type Tesseramento = Tables<"tesseramenti">;

const STATI = ["Attivo", "Scaduto", "Sospeso"];
const TIPI = ["Standard", "Agonistico", "Non agonistico", "Promozionale"];

const schema = z.object({
  persona_id: z.string().min(1, "Seleziona una persona"),
  stagione: z.string().min(1, "Stagione obbligatoria"),
  tipo_tesseramento: z.string().min(1, "Tipo obbligatorio"),
  stato: z.string().min(1, "Stato obbligatorio"),
  data_inizio: z.string().min(1, "Data inizio obbligatoria"),
  data_fine: z.string().optional().or(z.literal("")),
  importo: z.string().min(1, "Importo obbligatorio").refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Importo non valido"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tesseramento: Tesseramento | null;
  personeMap: Record<string, string>;
  onSave: (data: TablesInsert<"tesseramenti"> & { id?: string }) => void;
  isSaving: boolean;
}

export default function TesseramentoDialog({ open, onOpenChange, tesseramento, personeMap, onSave, isSaving }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      persona_id: "",
      stagione: "",
      tipo_tesseramento: "Standard",
      stato: "Attivo",
      data_inizio: new Date().toISOString().split("T")[0],
      data_fine: "",
      importo: "0",
    },
  });

  useEffect(() => {
    if (open) {
      if (tesseramento) {
        form.reset({
          persona_id: tesseramento.persona_id,
          stagione: tesseramento.stagione,
          tipo_tesseramento: tesseramento.tipo_tesseramento,
          stato: tesseramento.stato,
          data_inizio: tesseramento.data_inizio,
          data_fine: tesseramento.data_fine || "",
          importo: String(tesseramento.importo),
        });
      } else {
        form.reset({
          persona_id: "",
          stagione: "",
          tipo_tesseramento: "Standard",
          stato: "Attivo",
          data_inizio: new Date().toISOString().split("T")[0],
          data_fine: "",
          importo: "0",
        });
      }
    }
  }, [open, tesseramento]);

  const onSubmit = (values: FormValues) => {
    onSave({
      ...(tesseramento ? { id: tesseramento.id } : {}),
      persona_id: values.persona_id,
      stagione: values.stagione,
      tipo_tesseramento: values.tipo_tesseramento,
      stato: values.stato,
      data_inizio: values.data_inizio,
      data_fine: values.data_fine || null,
      importo: Number(values.importo),
    });
  };

  const personeList = Object.entries(personeMap).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tesseramento ? "Modifica Tesseramento" : "Nuovo Tesseramento"}</DialogTitle>
          <DialogDescription>{tesseramento ? "Modifica i dati del tesseramento" : "Inserisci i dati del nuovo tesseramento"}</DialogDescription>
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
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="stagione" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stagione *</FormLabel>
                  <FormControl><Input placeholder="2025/2026" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tipo_tesseramento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TIPI.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="stato" render={({ field }) => (
              <FormItem>
                <FormLabel>Stato *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {STATI.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="data_inizio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Inizio *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_fine" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Fine</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="importo" render={({ field }) => (
              <FormItem>
                <FormLabel>Importo (€) *</FormLabel>
                <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
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
