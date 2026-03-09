import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

const TIPI_DOCUMENTO = [
  { value: "Modulo iscrizione", label: "Modulo iscrizione" },
  { value: "Informativa privacy", label: "Informativa privacy (GDPR)" },
  { value: "Liberatoria medica", label: "Liberatoria medica" },
  { value: "Autorizzazione minori", label: "Autorizzazione minori" },
];

const DOCUMENT_CONTENT: Record<string, (p: Persona) => string[]> = {
  "Modulo iscrizione": (p) => [
    "MODULO DI ISCRIZIONE",
    "",
    `Il/La sottoscritto/a ${p.nome} ${p.cognome}`,
    p.codice_fiscale ? `C.F.: ${p.codice_fiscale}` : "",
    p.data_nascita ? `Nato/a il: ${new Date(p.data_nascita).toLocaleDateString("it-IT")}` : "",
    p.indirizzo ? `Residente in: ${p.indirizzo}` : "",
    "",
    "chiede di essere iscritto/a presso l'Associazione Sportiva per la stagione in corso.",
    "",
    "Dichiara di aver preso visione dello statuto e del regolamento interno",
    "e di accettarne integralmente il contenuto.",
  ],
  "Informativa privacy": (p) => [
    "INFORMATIVA SULLA PRIVACY (GDPR)",
    "",
    `Il/La sottoscritto/a ${p.nome} ${p.cognome}`,
    p.codice_fiscale ? `C.F.: ${p.codice_fiscale}` : "",
    "",
    "dichiara di aver ricevuto l'informativa ai sensi dell'art. 13 del Regolamento UE 2016/679",
    "(GDPR) relativa al trattamento dei dati personali e di acconsentire al trattamento",
    "dei propri dati per le finalità indicate nell'informativa.",
    "",
    "I dati saranno trattati con strumenti informatici e/o cartacei,",
    "nel rispetto delle misure di sicurezza previste dalla normativa vigente.",
  ],
  "Liberatoria medica": (p) => [
    "LIBERATORIA MEDICA / SCARICO RESPONSABILITÀ",
    "",
    `Il/La sottoscritto/a ${p.nome} ${p.cognome}`,
    p.codice_fiscale ? `C.F.: ${p.codice_fiscale}` : "",
    "",
    "dichiara di essere in buono stato di salute e di essere idoneo/a",
    "alla pratica dell'attività sportiva non agonistica.",
    "",
    "Solleva l'Associazione Sportiva da ogni responsabilità per danni",
    "derivanti dalla propria partecipazione alle attività sportive.",
    "",
    p.certificato_medico_scadenza
      ? `Certificato medico in scadenza il: ${new Date(p.certificato_medico_scadenza).toLocaleDateString("it-IT")}`
      : "Certificato medico: non presente",
  ],
  "Autorizzazione minori": (p) => [
    "AUTORIZZAZIONE PER ATLETI MINORENNI",
    "",
    `Il/La sottoscritto/a (genitore/tutore)`,
    "",
    `autorizza il/la minore ${p.nome} ${p.cognome}`,
    p.codice_fiscale ? `C.F.: ${p.codice_fiscale}` : "",
    p.data_nascita ? `Nato/a il: ${new Date(p.data_nascita).toLocaleDateString("it-IT")}` : "",
    "",
    "a partecipare alle attività sportive organizzate dall'Associazione.",
    "",
    "Si impegna a comunicare tempestivamente eventuali variazioni",
    "dello stato di salute del/della minore.",
  ],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: Persona;
}

export default function DocumentoFirmaDialog({ open, onOpenChange, persona }: Props) {
  const queryClient = useQueryClient();
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    setSignatureDataUrl(dataUrl);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tipoDocumento || !signatureDataUrl) throw new Error("Completa tutti i campi");

      // Generate PDF
      const doc = new jsPDF();
      const lines = DOCUMENT_CONTENT[tipoDocumento]?.(persona) || [];
      
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
        } else if (line === "") {
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

      // Add signature image
      const img = new Image();
      img.src = signatureDataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      doc.addImage(signatureDataUrl, "PNG", 50, y - 8, 80, 25);

      y += 30;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Firmato digitalmente da ${persona.nome} ${persona.cognome} in data ${dataFirma}`, 105, y, { align: "center" });

      // Convert to blob
      const pdfBlob = doc.output("blob");

      // Upload to storage
      const fileName = `${persona.id}/${tipoDocumento.replace(/\s/g, "_")}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("documenti-firmati")
        .upload(fileName, pdfBlob, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      // Save record
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
                {TIPI_DOCUMENTO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipoDocumento && (
            <div className="rounded-lg border bg-muted/30 p-3 max-h-[150px] overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-1">Anteprima contenuto:</p>
              {(DOCUMENT_CONTENT[tipoDocumento]?.(persona) || []).map((line, i) => (
                <p key={i} className={`text-xs ${i === 0 ? "font-bold text-sm" : ""} ${line === "" ? "h-2" : ""}`}>
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
