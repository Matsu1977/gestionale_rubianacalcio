import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type TipoRuolo = Database["public"]["Enums"]["tipo_ruolo"];

const RUOLI_OPTIONS: TipoRuolo[] = ["Dirigente", "Socio", "Abbonato", "Atleta", "Allenatore", "Genitore"];

const schema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio").max(100),
  cognome: z.string().trim().min(1, "Cognome obbligatorio").max(100),
  codice_fiscale: z.string().trim().max(16).optional().or(z.literal("")),
  data_nascita: z.string().optional().or(z.literal("")),
  telefono: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Email non valida").max(255).optional().or(z.literal("")),
  indirizzo: z.string().trim().max(255).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  certificato_medico_scadenza: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: Tables<"persone"> | null;
  personaRuoli: TipoRuolo[];
  onSave: (data: TablesInsert<"persone"> & { id?: string }, ruoli: TipoRuolo[]) => void;
  isSaving: boolean;
}

export default function PersonaDialog({ open, onOpenChange, persona, personaRuoli, onSave, isSaving }: Props) {
  const [selectedRuoli, setSelectedRuoli] = useState<TipoRuolo[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "", cognome: "", codice_fiscale: "", data_nascita: "",
      telefono: "", email: "", indirizzo: "", note: "", certificato_medico_scadenza: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (persona) {
        form.reset({
          nome: persona.nome,
          cognome: persona.cognome,
          codice_fiscale: persona.codice_fiscale || "",
          data_nascita: persona.data_nascita || "",
          telefono: persona.telefono || "",
          email: persona.email || "",
          indirizzo: persona.indirizzo || "",
          note: persona.note || "",
          certificato_medico_scadenza: persona.certificato_medico_scadenza || "",
        });
        setSelectedRuoli(personaRuoli);
      } else {
        form.reset({
          nome: "", cognome: "", codice_fiscale: "", data_nascita: "",
          telefono: "", email: "", indirizzo: "", note: "", certificato_medico_scadenza: "",
        });
        setSelectedRuoli([]);
      }
    }
  }, [open, persona, personaRuoli, form]);

  const toggleRuolo = (ruolo: TipoRuolo) => {
    setSelectedRuoli((prev) =>
      prev.includes(ruolo) ? prev.filter((r) => r !== ruolo) : [...prev, ruolo]
    );
  };

  const onSubmit = (values: FormValues) => {
    const data: TablesInsert<"persone"> & { id?: string } = {
      nome: values.nome,
      cognome: values.cognome,
      codice_fiscale: values.codice_fiscale ? values.codice_fiscale.toUpperCase() : null,
      data_nascita: values.data_nascita || null,
      telefono: values.telefono || null,
      email: values.email || null,
      indirizzo: values.indirizzo || null,
      note: values.note || null,
      certificato_medico_scadenza: values.certificato_medico_scadenza || null,
    };
    if (persona) data.id = persona.id;
    onSave(data, selectedRuoli);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{persona ? "Modifica Persona" : "Nuova Persona"}</DialogTitle>
          <DialogDescription>
            {persona ? "Modifica i dati della persona" : "Compila i dati per aggiungere una nuova persona"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cognome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cognome *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="codice_fiscale" render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice Fiscale</FormLabel>
                  <FormControl><Input {...field} maxLength={16} className="uppercase" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_nascita" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data di Nascita</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="telefono" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="indirizzo" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Indirizzo</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="certificato_medico_scadenza" render={({ field }) => (
                <FormItem>
                  <FormLabel>Scadenza Certificato Medico</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Ruoli section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Ruoli</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {RUOLI_OPTIONS.map((ruolo) => (
                  <label
                    key={ruolo}
                    className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedRuoli.includes(ruolo)}
                      onCheckedChange={() => toggleRuolo(ruolo)}
                    />
                    <span className="text-sm">{ruolo}</span>
                  </label>
                ))}
              </div>
            </div>

            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvataggio..." : persona ? "Salva modifiche" : "Crea persona"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
