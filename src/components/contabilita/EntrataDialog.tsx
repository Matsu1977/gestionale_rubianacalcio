import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MetodoPag = Database["public"]["Enums"]["metodo_pagamento"];

const METODI: MetodoPag[] = ["Contanti", "Bonifico", "Carta", "Satispay", "Altro"];

const schema = z.object({
  data: z.string().min(1, "Data obbligatoria"),
  importo: z.string().min(1, "Importo obbligatorio").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Importo deve essere maggiore di 0"),
  categoria_entrata: z.string().min(1, "Categoria obbligatoria"),
  descrizione: z.string().max(500).optional().or(z.literal("")),
  metodo_pagamento: z.enum(["Contanti", "Bonifico", "Carta", "Satispay", "Altro"], { required_error: "Seleziona metodo" }),
  persona: z.string().max(200).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    data: string;
    importo: number;
    categoria_entrata: string;
    descrizione: string;
    metodo_pagamento: MetodoPag;
    persona: string | null;
  }) => void;
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      data: new Date().toISOString().split("T")[0],
      importo: "",
      categoria_entrata: "",
      descrizione: "",
      metodo_pagamento: undefined,
      persona: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    onSave({
      data: values.data,
      importo: Number(values.importo),
      categoria_entrata: values.categoria_entrata,
      descrizione: values.descrizione || "",
      metodo_pagamento: values.metodo_pagamento,
      persona: values.persona || null,
    });
    form.reset({
      data: new Date().toISOString().split("T")[0],
      importo: "",
      categoria_entrata: "",
      descrizione: "",
      metodo_pagamento: undefined,
      persona: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova Entrata</DialogTitle>
          <DialogDescription>Registra una nuova entrata</DialogDescription>
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
            <FormField control={form.control} name="importo" render={({ field }) => (
              <FormItem>
                <FormLabel>Importo (€) *</FormLabel>
                <FormControl><Input type="number" step="0.01" min="0.01" placeholder="0.00" {...field} /></FormControl>
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
            <FormField control={form.control} name="persona" render={({ field }) => (
              <FormItem>
                <FormLabel>Persona / Riferimento</FormLabel>
                <FormControl><Input placeholder="Es. Mario Rossi..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="descrizione" render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Note aggiuntive..." {...field} /></FormControl>
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
