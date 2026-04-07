import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Landmark } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_KEYS = [
  { key: "pagamento_iban", label: "IBAN", placeholder: "IT60X0542811101000000123456" },
  { key: "pagamento_intestatario", label: "Intestatario", placeholder: "ASD Nome Associazione" },
  { key: "pagamento_banca", label: "Banca", placeholder: "Nome Banca - Filiale" },
  { key: "pagamento_causale", label: "Causale suggerita", placeholder: "Quota associativa / Abbonamento" },
  { key: "pagamento_paypal_link", label: "Link PayPal", placeholder: "https://paypal.me/tuolink" },
];

export default function DatiPagamentoSettingsCard() {
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [noteValue, setNoteValue] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["impostazioni-pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impostazioni_generali")
        .select("chiave, valore")
        .like("chiave", "pagamento_%");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.chiave] = s.valore || ""; });
      return map;
    },
  });

  useEffect(() => {
    if (settings) {
      const vals: Record<string, string> = {};
      PAYMENT_KEYS.forEach((k) => { vals[k.key] = settings[k.key] || ""; });
      setFormValues(vals);
      setNoteValue(settings["pagamento_note"] || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const allVals = { ...formValues, pagamento_note: noteValue };
      for (const [chiave, valore] of Object.entries(allVals)) {
        const { error } = await supabase
          .from("impostazioni_generali")
          .update({ valore, updated_at: new Date().toISOString() })
          .eq("chiave", chiave);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impostazioni-pagamento"] });
      toast.success("Dati di pagamento salvati");
    },
    onError: () => toast.error("Errore nel salvataggio"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Dati per il Pagamento
        </CardTitle>
        <CardDescription>
          Queste informazioni saranno visibili nella pagina personale di ogni iscritto per effettuare i pagamenti.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PAYMENT_KEYS.map((k) => (
          <div key={k.key} className="space-y-1.5">
            <Label>{k.label}</Label>
            <Input
              placeholder={k.placeholder}
              value={formValues[k.key] || ""}
              onChange={(e) => setFormValues((prev) => ({ ...prev, [k.key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label>Note aggiuntive</Label>
          <Textarea
            rows={3}
            placeholder="Eventuali istruzioni aggiuntive per il pagamento..."
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
          />
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salva
        </Button>
      </CardContent>
    </Card>
  );
}
