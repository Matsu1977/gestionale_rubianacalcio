import { useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSend = async () => {
    if (!titolo.trim() || !messaggio.trim()) {
      toast.error("Compila titolo e messaggio");
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

      if (destinatario !== "tutti") {
        payload.ruolo_destinatario = destinatario;
      }

      const { error } = await supabase.from("notifiche").insert(payload as any);
      if (error) throw error;

      toast.success("Notifica inviata!");
      setTitolo("");
      setMessaggio("");
      setDestinatario("tutti");
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
            <Select value={destinatario} onValueChange={setDestinatario}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="segreteria">Segreteria</SelectItem>
                <SelectItem value="allenatore">Allenatori</SelectItem>
                <SelectItem value="atleta">Atleti</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
