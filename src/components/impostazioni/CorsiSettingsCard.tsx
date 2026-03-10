import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Corso {
  id: string;
  nome: string;
  descrizione: string | null;
  attivo: boolean;
  created_at: string;
}

export default function CorsiSettingsCard() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Corso | null>(null);
  const [nome, setNome] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [attivo, setAttivo] = useState(true);

  const { data: corsi = [], isLoading } = useQuery({
    queryKey: ["corsi"],
    queryFn: async () => {
      const { data, error } = await supabase.from("corsi").select("*").order("nome");
      if (error) throw error;
      return data as Corso[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("corsi").update({ nome, descrizione: descrizione || null, attivo }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("corsi").insert({ nome, descrizione: descrizione || null, attivo });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corsi"] });
      toast.success(editing ? "Corso aggiornato" : "Corso creato");
      closeDialog();
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("corsi").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corsi"] });
      toast.success("Corso eliminato");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setDescrizione("");
    setAttivo(true);
    setDialogOpen(true);
  };

  const openEdit = (c: Corso) => {
    setEditing(c);
    setNome(c.nome);
    setDescrizione(c.descrizione || "");
    setAttivo(c.attivo);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Gestione Corsi
              </CardTitle>
              <CardDescription>Crea e gestisci i corsi sportivi dell'associazione.</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nuovo Corso
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : corsi.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nessun corso creato. Clicca "Nuovo Corso" per iniziare.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Descrizione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {corsi.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{c.descrizione || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={c.attivo ? "bg-green-500/15 text-green-700 border-green-500/30" : "bg-muted text-muted-foreground"}>
                        {c.attivo ? "Attivo" : "Disattivato"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare il corso?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Il corso "{c.nome}" verrà eliminato definitivamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(c.id)}>Elimina</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Corso" : "Nuovo Corso"}</DialogTitle>
            <DialogDescription>{editing ? "Modifica i dati del corso" : "Inserisci i dati del nuovo corso"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Calcio Under 14" />
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Opzionale" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={attivo} onCheckedChange={setAttivo} />
              <Label>Corso attivo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annulla</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !nome.trim()}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Aggiorna" : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
