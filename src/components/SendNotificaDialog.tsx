import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function SendNotificaDialog() {
  const [open, setOpen] = useState(false);
  const [titolo, setTitolo] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [destinatario, setDestinatario] = useState("tutti");
  const [personaId, setPersonaId] = useState("");
  const [persone, setPersone] = useState<{ id: string; nome: string; cognome: string; user_id: string | null }[]>([]);
  const [searchPersona, setSearchPersona] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (destinatario === "persona") {
      supabase
        .from("persone")
        .select("id, nome, cognome, user_id")
        .not("user_id", "is", null)
        .order("cognome")
        .then(({ data }) => {
          if (data) setPersone(data);
        });
    }
  }, [destinatario]);

  const filteredPersone = persone.filter((p) =>
    `${p.cognome} ${p.nome}`.toLowerCase().includes(searchPersona.toLowerCase())
  );

  const handleSend = async () => {
    if (!titolo.trim() || !messaggio.trim()) {
      toast.error("Compila titolo e messaggio");
      return;
    }
    if (destinatario === "persona" && !personaId) {
      toast.error("Seleziona una persona");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        titolo: titolo.trim(),
        messaggio: messaggio.trim(),
        tipo: "manuale",
        letta: false,
      };

      if (destinatario === "persona") {
        // Find the user_id for the selected persona
        const persona = persone.find((p) => p.id === personaId);
        if (persona?.user_id) {
          payload.user_id = persona.user_id;
        }
      } else if (destinatario !== "tutti") {
        payload.ruolo_destinatario = destinatario;
      }

      const { error } = await supabase.from("notifiche").insert(payload as any);
      if (error) throw error;

      toast.success("Notifica inviata!");
      setTitolo("");
      setMessaggio("");
      setDestinatario("tutti");
      setPersonaId("");
      setSearchPersona("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["notifiche"] });
    } catch (err: any) {
      toast.error("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="h-4 w-4 mr-2" />
          Invia Notifica
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invia Notifica</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Destinatari</Label>
            <Select value={destinatario} onValueChange={(v) => { setDestinatario(v); setPersonaId(""); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="segreteria">Segreteria</SelectItem>
                <SelectItem value="allenatore">Allenatori</SelectItem>
                <SelectItem value="atleta">Atleti</SelectItem>
                <SelectItem value="persona">Singola persona</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {destinatario === "persona" && (
            <div>
              <Label>Cerca persona</Label>
              <Input
                value={searchPersona}
                onChange={(e) => setSearchPersona(e.target.value)}
                placeholder="Cerca per nome o cognome..."
                className="mb-2"
              />
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredPersone.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">Nessuna persona con account trovata</p>
                ) : (
                  filteredPersone.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${personaId === p.id ? "bg-accent font-medium" : ""}`}
                      onClick={() => setPersonaId(p.id)}
                    >
                      {p.cognome} {p.nome}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          <div>
            <Label>Titolo</Label>
            <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Titolo della notifica" />
          </div>
          <div>
            <Label>Messaggio</Label>
            <Textarea value={messaggio} onChange={(e) => setMessaggio(e.target.value)} placeholder="Scrivi il messaggio..." rows={4} />
          </div>
          <Button onClick={handleSend} disabled={loading} className="w-full">
            {loading ? "Invio..." : "Invia Notifica"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
