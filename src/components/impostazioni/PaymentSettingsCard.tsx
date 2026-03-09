import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard, CheckCircle2, XCircle, AlertTriangle, Loader2, Eye, EyeOff, ExternalLink, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type StripeStatus = {
  connected: boolean;
  mode: "test" | "live" | "unknown";
  accountName?: string;
};

export default function PaymentSettingsCard() {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [stripeKey, setStripeKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showKey, setShowKey] = useState(false);

  const { data: stripeStatus, isLoading: statusLoading } = useQuery<StripeStatus>({
    queryKey: ["stripe-status"],
    queryFn: async () => {
      try {
        const res = await supabase.functions.invoke("admin-users", {
          body: { action: "check_stripe_status" },
        });
        if (res.data?.connected !== undefined) return res.data as StripeStatus;
        return { connected: false, mode: "unknown" as const };
      } catch {
        return { connected: false, mode: "unknown" as const };
      }
    },
  });

  const updateKeysMutation = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("admin-users", {
        body: {
          action: "update_stripe_keys",
          stripe_key: stripeKey || undefined,
          webhook_secret: webhookSecret || undefined,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Chiavi Stripe aggiornate");
      setShowUpdateDialog(false);
      setStripeKey("");
      setWebhookSecret("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusIcon = stripeStatus?.connected ? (
    <CheckCircle2 className="h-5 w-5 text-green-600" />
  ) : (
    <XCircle className="h-5 w-5 text-destructive" />
  );

  const modeBadge = stripeStatus?.mode === "live" ? (
    <Badge className="bg-green-600 hover:bg-green-700">Live</Badge>
  ) : stripeStatus?.mode === "test" ? (
    <Badge variant="outline" className="border-amber-500/50 text-amber-700 bg-amber-500/10">Test</Badge>
  ) : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Sistemi di pagamento
          </CardTitle>
          <CardDescription>
            Configura i gateway di pagamento per accettare pagamenti online.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stripe Section */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#635BFF]/10">
                  <CreditCard className="h-5 w-5 text-[#635BFF]" />
                </div>
                <div>
                  <h3 className="font-semibold">Stripe</h3>
                  <p className="text-sm text-muted-foreground">Pagamenti con carta di credito e debito</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {modeBadge}
                {statusLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  statusIcon
                )}
              </div>
            </div>

            <Separator />

            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stato</span>
                <span className="font-medium">
                  {statusLoading ? "Verifica..." : stripeStatus?.connected ? "Collegato" : "Non collegato"}
                </span>
              </div>
              {stripeStatus?.mode && stripeStatus.mode !== "unknown" && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Modalità</span>
                  <span className="font-medium">
                    {stripeStatus.mode === "test" ? "Test (sandbox)" : "Produzione (live)"}
                  </span>
                </div>
              )}
            </div>

            {stripeStatus?.mode === "test" && (
              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <strong>Modalità test attiva.</strong> I pagamenti non sono reali. Per passare alla modalità live, aggiorna le chiavi con quelle del tuo account Stripe di produzione.
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowUpdateDialog(true)}>
                {stripeStatus?.connected ? "Aggiorna chiavi" : "Configura Stripe"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                  Dashboard Stripe
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>

          {/* Future Payment Methods */}
          <div className="rounded-lg border border-dashed p-4 space-y-3 opacity-60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-muted-foreground">Altri metodi di pagamento</h3>
                <p className="text-sm text-muted-foreground">PayPal, Satispay, Bonifico automatico</p>
              </div>
            </div>
            <Badge variant="secondary">Prossimamente</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Update Stripe Keys Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configura chiavi Stripe</DialogTitle>
            <DialogDescription>
              Inserisci le chiavi API del tuo account Stripe. Per passare da test a live, usa le chiavi di produzione (iniziano con <code>sk_live_</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Secret Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  placeholder="sk_test_... o sk_live_..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Trovi la secret key nella{" "}
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline">
                  Dashboard Stripe → API Keys
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Webhook Secret</Label>
              <Input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="whsec_..."
              />
              <p className="text-xs text-muted-foreground">
                Opzionale. Aggiorna solo se hai creato un nuovo webhook endpoint.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>Annulla</Button>
            <Button
              onClick={() => updateKeysMutation.mutate()}
              disabled={updateKeysMutation.isPending || (!stripeKey && !webhookSecret)}
            >
              {updateKeysMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
