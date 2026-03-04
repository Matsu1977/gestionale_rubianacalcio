import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  importo: z.string().min(1, "Importo obbligatorio").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Importo > 0"),
  metodo_pagamento: z.enum(["Contanti", "Bonifico", "Carta", "Satispay", "Altro"], { required_error: "Seleziona metodo" }),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSave: (data: { data: string; importo: number; metodo_pagamento: MetodoPag; note: string | null }) => void;
  isSaving: boolean;
}

export default function AddPaymentDialog({ open, onOpenChange, title, onSave, isSaving }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { data: new Date().toISOString().split("T")[0], importo: "", metodo_pagamento: undefined, note: "" },
  });

  const onSubmit = (v: FormValues) => {
    onSave({ data: v.data, importo: Number(v.importo), metodo_pagamento: v.metodo_pagamento, note: v.note || null });
    form.reset({ data: new Date().toISOString().split("T")[0], importo: "", metodo_pagamento: undefined, note: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registra Pagamento</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="data" render={({ field }) => (
              <FormItem><FormLabel>Data *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="importo" render={({ field }) => (
              <FormItem><FormLabel>Importo (€) *</FormLabel><FormControl><Input type="number" step="0.01" min="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="metodo_pagamento" render={({ field }) => (
              <FormItem><FormLabel>Metodo *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger></FormControl>
                  <SelectContent>{METODI.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem><FormLabel>Note</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Salvataggio..." : "Registra"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
