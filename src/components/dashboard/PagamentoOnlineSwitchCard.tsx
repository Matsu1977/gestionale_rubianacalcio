import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Lock } from "lucide-react";
import { usePagamentoOnline, useTogglePagamentoOnline } from "@/hooks/usePagamentoOnline";

export function PagamentoOnlineSwitchCard() {
  const { attivo, isLoading } = usePagamentoOnline();
  const toggle = useTogglePagamentoOnline();

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          Pagamento Online
        </CardTitle>
        <CardDescription className="text-xs">
          Controlla se gli atleti vedono i pulsanti di pagamento online (Stripe / PayPal / Satispay) nella loro area.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{attivo ? "Attivo" : "Disattivato"}</p>
              <p className="text-xs text-muted-foreground">
                {attivo
                  ? "Gli atleti possono pagare online."
                  : "I pagamenti vengono gestiti solo manualmente dalla segreteria."}
              </p>
            </div>
          </div>
          <Switch
            checked={attivo}
            disabled={isLoading || toggle.isPending}
            onCheckedChange={(v) => toggle.mutate(v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
