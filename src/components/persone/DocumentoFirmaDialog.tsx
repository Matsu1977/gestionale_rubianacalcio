import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import SignatureCanvas from "./SignatureCanvas";

type Persona = Tables<"persone">;

function resolveTemplate(template: string, persona: Persona): string {
  const dataFmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("it-IT") : "non disponibile";

  return template
    .replace(/\{nome\}/g, persona.nome)
    .replace(/\{cognome\}/g, persona.cognome)
    .replace(/\{codice_fiscale\}/g, persona.codice_fiscale?.toUpperCase() || "non disponibile")
    .replace(/\{data_nascita\}/g, dataFmt(persona.data_nascita))
    .replace(/\{indirizzo\}/g, persona.indirizzo || "non disponibile")
    .replace(/\{certificato_medico\}/g,
      persona.certificato_medico_scadenza
        ? `in scadenza il ${dataFmt(persona.certificato_medico_scadenza)}`
        : "non presente"
    );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: Persona;
}

export default function DocumentoFirmaDialog({ open, onOpenChange, persona }: Props) {
  const queryClient = useQueryClient();
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const { data: modelli = [] } = useQuery({
    queryKey: ["modelli-documento-attivi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modelli_documento")
        .select("*")
        .eq("attivo", true)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const selectedModello = modelli.find((m) => m.tipo_documento === tipoDocumento);
  const previewContent = selectedModello ? resolveTemplate(selectedModello.contenuto, persona) : "";

  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    setSignatureDataUrl(dataUrl);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tipoDocumento || !signatureDataUrl || !selectedModello) throw new Error("Completa tutti i campi");

      const resolvedText = resolveTemplate(selectedModello.contenuto, persona);
      const lines = resolvedText.split("\n");

      // Generate PDF
      const doc = new jsPDF();

      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("Documento generato digitalmente", 105, 15, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor(0);
      let y = 30;

      for (const line of lines) {
        if (line === lines[0]) {
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.text(line, 105, y, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
        } else if (line.trim() === "") {
          y += 4;
        } else {
          doc.text(line, 20, y);
        }
        y += 7;
      }

      // Add date and signature
      y += 10;
      const dataFirma = new Date().toLocaleDateString("it-IT");
      doc.text(`Data: ${dataFirma}`, 20, y);
      y += 10;
      doc.text("Firma:", 20, y);

      const img = new Image();
      img.src = signatureDataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      doc.addImage(signatureDataUrl, "PNG", 50, y - 8, 80, 25);

      y += 30;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Firmato digitalmente da ${persona.nome} ${persona.cognome} in data ${dataFirma}`, 105, y, { align: "center" });

      const pdfBlob = doc.output("blob");

      const fileName = `${persona.id}/${tipoDocumento.replace(/\s/g, "_")}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("documenti-firmati")
        .upload(fileName, pdfBlob, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("documenti_firmati").insert({
        persona_id: persona.id,
        tipo_documento: tipoDocumento,
        nome_persona: `${persona.nome} ${persona.cognome}`,
        file_path: fileName,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documenti-firmati", persona.id] });
      toast.success("Documento firmato e salvato");
      setTipoDocumento("");
      setSignatureDataUrl(null);
      onOpenChange(false);
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Firma Documento
          </DialogTitle>
          <DialogDescription>
            Genera e firma un documento per {persona.nome} {persona.cognome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Tipo documento</Label>
            <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo documento..." />
              </SelectTrigger>
              <SelectContent>
                {modelli.map((m) => (
                  <SelectItem key={m.id} value={m.tipo_documento}>{m.titolo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipoDocumento && previewContent && (
            <div className="rounded-lg border bg-muted/30 p-3 max-h-[150px] overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-1">Anteprima contenuto:</p>
              {previewContent.split("\n").map((line, i) => (
                <p key={i} className={`text-xs ${i === 0 ? "font-bold text-sm" : ""} ${line.trim() === "" ? "h-2" : ""}`}>
                  {line}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Firma</Label>
            <SignatureCanvas onSignatureChange={handleSignatureChange} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!tipoDocumento || !signatureDataUrl || saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Firma e Salva PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
