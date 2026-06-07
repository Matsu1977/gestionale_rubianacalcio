import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"invite" | "recovery">("recovery");
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase processa il token dall'URL e triggera un evento
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recovery");
        setReady(true);
      } else if (event === "USER_UPDATED") {
        navigate("/");
      } else if (session && window.location.hash.includes("type=invite")) {
        setMode("invite");
        setReady(true);
      }
    });

    // Controlla anche l'hash direttamente
    const hash = window.location.hash;
    if (hash.includes("type=invite") || hash.includes("type=recovery")) {
      setMode(hash.includes("type=invite") ? "invite" : "recovery");
      setReady(true);
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(mode === "invite" ? "Benvenuto!" : "Password aggiornata!");
      navigate("/");
    }
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === "invite" ? "Crea la tua password" : "Nuova Password"}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "invite"
              ? "Benvenuto! Scegli una password per accedere al gestionale."
              : "Inserisci la nuova password per il tuo account."}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                {mode === "invite" ? "Scegli una password" : "Nuova password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Minimo 6 caratteri"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "invite" ? "Accedi al gestionale" : "Aggiorna password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}