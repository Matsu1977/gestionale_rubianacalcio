import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Check, Clock, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface Rata {
  id: string;
  numero_rata: number;
  data_scadenza: string;
  importo: number;
  stato: string;
  abbonamento_id: string;
}

interface Abbonamento {
  id: string;
  corso: string;
  stagione: string;
}

interface RateListCardProps {
  rate: Rata[];
  abbonamento: Abbonamento;
  pagamentoOnlineAttivo?: boolean;
}

export function RateListCard({ rate, abbonamento, pagamentoOnlineAttivo = false }: RateListCardProps) {
  const [loadingRataId, setLoadingRataId] = useState<string | null>(null);

  const handlePayOnline = async (rataId: string) => {
    setLoadingRataId(rataId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { rata_id: rataId },
      });

      if (error) {
        console.error("Error creating checkout session:", error);
        toast.error("Errore durante la creazione del pagamento");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Errore: URL di pagamento non disponibile");
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Errore durante la creazione del pagamento");
    } finally {
      setLoadingRataId(null);
    }
  };

  const rateOrdered = [...rate].sort((a, b) => a.numero_rata - b.numero_rata);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Rate {abbonamento.corso} - {abbonamento.stagione}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rateOrdered.map((rata) => {
          const isPaid = rata.stato === "Pagata";
          const isLoading = loadingRataId === rata.id;

          return (
            <div
              key={rata.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    isPaid ? "bg-green-500/20 text-green-600" : "bg-amber-500/20 text-amber-600"
                  }`}
                >
                  {isPaid ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">Rata {rata.numero_rata}</p>
                  <p className="text-xs text-muted-foreground">
                    Scadenza: {format(parseISO(rata.data_scadenza), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    € {Number(rata.importo).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                  </p>
                  <Badge
                    variant={isPaid ? "default" : "secondary"}
                    className={isPaid ? "bg-green-500/20 text-green-600 hover:bg-green-500/30" : ""}
                  >
                    {isPaid ? "Pagato" : "Da pagare"}
                  </Badge>
                </div>

                {!isPaid && pagamentoOnlineAttivo && (
                  <Button
                    size="sm"
                    onClick={() => handlePayOnline(rata.id)}
                    disabled={isLoading}
                    className="ml-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-1" />
                        Paga online
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
