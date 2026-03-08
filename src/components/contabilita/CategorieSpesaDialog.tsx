import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CategorieSpesaDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"Entrata" | "Uscita">("Entrata");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const { data: allCategorie = [], isLoading } = useQuery({
    queryKey: ["categorie-contabili"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorie_spesa")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const categorie = allCategorie.filter((c) => c.tipo === tab);

  // Check which categories are in use
  const { data: usedCategories = [] } = useQuery({
    queryKey: ["categorie-in-use"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti")
        .select("note, categoria");
      if (error) throw error;
      const used = new Set<string>();
      for (const m of data) {
        // Uscite store category in notes as [Categoria]
        const match = m.note?.match(/^\[(.+?)\]/);
        if (match) used.add(match[1]);
        // Entrate use categoria field
        if (m.categoria) used.add(m.categoria);
      }
      return Array.from(used);
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ nome, tipo }: { nome: string; tipo: string }) => {
      const { error } = await supabase.from("categorie_spesa").insert({ nome, tipo });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorie-contabili"] });
      queryClient.invalidateQueries({ queryKey: ["categorie-spesa"] });
      setNewName("");
      toast.success("Categoria aggiunta");
    },
    onError: (e) => toast.error(e.message.includes("unique") ? "Categoria già esistente" : e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase.from("categorie_spesa").update({ nome }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorie-contabili"] });
      queryClient.invalidateQueries({ queryKey: ["categorie-spesa"] });
      setEditingId(null);
      toast.success("Categoria aggiornata");
    },
    onError: (e) => toast.error(e.message.includes("unique") ? "Nome già in uso" : e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorie_spesa").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorie-contabili"] });
      queryClient.invalidateQueries({ queryKey: ["categorie-spesa"] });
      toast.success("Categoria eliminata");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addMutation.mutate({ nome: trimmed, tipo: tab });
  };

  const startEdit = (id: string, nome: string) => {
    setEditingId(id);
    setEditingName(nome);
  };

  const confirmEdit = () => {
    const trimmed = editingName.trim();
    if (!trimmed || !editingId) return;
    updateMutation.mutate({ id: editingId, nome: trimmed });
  };

  const renderList = () => (
    <div className="space-y-1 max-h-[280px] overflow-y-auto">
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Caricamento...</p>
      ) : categorie.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nessuna categoria</p>
      ) : (
        categorie.map((cat) => {
          const isUsed = usedCategories.includes(cat.nome);
          const isEditing = editingId === cat.id;

          return (
            <div key={cat.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group">
              {isEditing ? (
                <>
                  <Input
                    className="h-8 text-sm flex-1"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmEdit()}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={confirmEdit}>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{cat.nome}</span>
                  <Button
                    size="icon" variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEdit(cat.id, cat.nome)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isUsed}
                    title={isUsed ? "Categoria in uso, non eliminabile" : "Elimina"}
                    onClick={() => deleteMutation.mutate(cat.id)}
                  >
                    <Trash2 className={`h-3.5 w-3.5 ${isUsed ? "text-muted-foreground" : "text-destructive"}`} />
                  </Button>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gestione Categorie Contabili</DialogTitle>
          <DialogDescription>Crea, modifica o elimina le categorie per entrate e uscite</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as "Entrata" | "Uscita"); setEditingId(null); setNewName(""); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="Entrata">Categorie Entrate</TabsTrigger>
            <TabsTrigger value="Uscita">Categorie Uscite</TabsTrigger>
          </TabsList>
          <TabsContent value="Entrata" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nuova categoria entrata..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || addMutation.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {renderList()}
          </TabsContent>
          <TabsContent value="Uscita" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nuova categoria uscita..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || addMutation.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {renderList()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
