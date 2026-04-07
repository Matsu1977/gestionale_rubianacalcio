import { motion } from "framer-motion";
import { User, CalendarCheck, Wallet, FileCheck, MessageSquare, ClipboardCheck, Landmark, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import { RateListCard } from "@/components/atleta/RateListCard";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function AtletaDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle payment result from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success("Pagamento completato con successo!");
      searchParams.delete("payment");
      searchParams.delete("rata_id");
      setSearchParams(searchParams, { replace: true });
    } else if (paymentStatus === "cancelled") {
      toast.info("Pagamento annullato");
      searchParams.delete("payment");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Get persona linked to this user
  const { data: persona } = useQuery({
    queryKey: ["atleta-persona", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("persone")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Get abbonamenti for this persona
  const { data: abbonamenti, refetch: refetchAbbonamenti } = useQuery({
    queryKey: ["atleta-abbonamenti", persona?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("abbonamenti")
        .select("*")
        .eq("persona_id", persona!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!persona,
  });

  // Get rate for abbonamenti
  const { data: rate, refetch: refetchRate } = useQuery({
    queryKey: ["atleta-rate", persona?.id],
    queryFn: async () => {
      const abbIds = (abbonamenti || []).map((a) => a.id);
      if (abbIds.length === 0) return [];
      const { data } = await supabase
        .from("rate")
        .select("*")
        .in("abbonamento_id", abbIds)
        .order("data_scadenza", { ascending: true });
      return data || [];
    },
    enabled: !!abbonamenti && abbonamenti.length > 0,
  });

  // Refetch after payment success
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      refetchAbbonamenti();
      refetchRate();
    }
  }, [searchParams, refetchAbbonamenti, refetchRate]);

  // Get movimenti (pagamenti) for this persona
  const { data: movimenti } = useQuery({
    queryKey: ["atleta-movimenti", persona?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("movimenti")
        .select("*")
        .eq("persona_id", persona!.id)
        .order("data", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!persona,
  });

  // Get comunicazioni sent to this persona or their corso
  const { data: comunicazioni } = useQuery({
    queryKey: ["atleta-comunicazioni", persona?.id],
    queryFn: async () => {
      // Get comunicazioni where persona is a destinatario
      const { data: destData } = await supabase
        .from("comunicazioni_destinatari")
        .select("comunicazione_id")
        .eq("persona_id", persona!.id);

      const commIds = (destData || []).map((d) => d.comunicazione_id);

      // Also get comunicazioni sent to "tutti" or to their corsi
      const corsi = (abbonamenti || []).map((a) => a.corso);
      
      const { data } = await supabase
        .from("comunicazioni")
        .select("*")
        .or(
          [
            commIds.length > 0 ? `id.in.(${commIds.join(",")})` : null,
            `tipo_destinatari.eq.tutti`,
            ...corsi.map((c) => `corso_filtro.eq.${c}`),
          ]
            .filter(Boolean)
            .join(",")
        )
        .order("created_at", { ascending: false })
        .limit(10);

      return data || [];
    },
    enabled: !!persona && !!abbonamenti,
  });

  // Presenze stats
  const { data: presenzeStats } = useQuery({
    queryKey: ["atleta-presenze", persona?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("presenze")
        .select("presente, sessione_id")
        .eq("persona_id", persona!.id);
      const totale = (data || []).length;
      const presenti = (data || []).filter((p) => p.presente).length;
      return { totale, presenti, percentuale: totale > 0 ? Math.round((presenti / totale) * 100) : 0 };
    },
    enabled: !!persona,
  });

  // Get payment info settings
  const { data: paymentInfo } = useQuery({
    queryKey: ["payment-info-atleta"],
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

  const hasPaymentInfo = paymentInfo && (paymentInfo.pagamento_iban || paymentInfo.pagamento_intestatario);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiato negli appunti");
  };

  const today = new Date();
  const certScaduto = persona?.certificato_medico_scadenza
    ? isBefore(parseISO(persona.certificato_medico_scadenza), today)
    : false;

  if (!persona) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">La mia Area</h1>
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Il tuo account non è ancora collegato a un profilo atleta. Contatta la segreteria.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group rate by abbonamento
  const rateByAbbonamento = (abbonamenti || []).map((abb) => ({
    abbonamento: abb,
    rate: (rate || []).filter((r) => r.abbonamento_id === abb.id),
  })).filter((item) => item.rate.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">La mia Area</h1>
          <p className="text-muted-foreground mt-1">
            Benvenuto, {persona.nome} {persona.cognome}
          </p>
        </div>
        <ChangePasswordDialog />
      </div>

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Info Personali */}
        <motion.div variants={item} className="lg:col-span-1">
          <Card className="glass-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informazioni Personali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome</span>
                <span className="font-medium">{persona.nome} {persona.cognome}</span>
              </div>
              {persona.data_nascita && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data di nascita</span>
                  <span>{format(parseISO(persona.data_nascita), "dd/MM/yyyy")}</span>
                </div>
              )}
              {persona.codice_fiscale && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Codice Fiscale</span>
                  <span className="font-mono text-xs uppercase">{persona.codice_fiscale}</span>
                </div>
              )}
              {persona.email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{persona.email}</span>
                </div>
              )}
              {persona.telefono && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefono</span>
                  <span>{persona.telefono}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Certificato Medico */}
        <motion.div variants={item}>
          <Card className="glass-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Certificato Medico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {persona.certificato_medico_scadenza ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Scadenza</span>
                    <span className="text-sm font-medium">
                      {format(parseISO(persona.certificato_medico_scadenza), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <Badge variant={certScaduto ? "destructive" : "default"}>
                    {certScaduto ? "Scaduto" : "Valido"}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nessun certificato registrato</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Presenze */}
        <motion.div variants={item}>
          <Card className="glass-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Presenze
              </CardTitle>
            </CardHeader>
            <CardContent>
              {presenzeStats ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Frequenza</span>
                    <span className="text-2xl font-bold">{presenzeStats.percentuale}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {presenzeStats.presenti} presenze su {presenzeStats.totale} sessioni
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nessuna presenza registrata</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Rate con pagamento online */}
      {rateByAbbonamento.length > 0 && (
        <motion.div variants={item} initial="hidden" animate="show" className="space-y-4">
          <h2 className="text-xl font-semibold">Le mie Rate</h2>
          {rateByAbbonamento.map(({ abbonamento, rate }) => (
            <RateListCard key={abbonamento.id} rate={rate} abbonamento={abbonamento} />
          ))}
        </motion.div>
      )}

      {/* Dati per il pagamento */}
      {hasPaymentInfo && (
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                Dati per il Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {paymentInfo.pagamento_intestatario && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Intestatario</span>
                  <span className="font-medium">{paymentInfo.pagamento_intestatario}</span>
                </div>
              )}
              {paymentInfo.pagamento_iban && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">IBAN</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs font-medium">{paymentInfo.pagamento_iban}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(paymentInfo.pagamento_iban)}
                      title="Copia IBAN"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              {paymentInfo.pagamento_banca && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Banca</span>
                  <span>{paymentInfo.pagamento_banca}</span>
                </div>
              )}
              {paymentInfo.pagamento_causale && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">Causale</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{paymentInfo.pagamento_causale}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(paymentInfo.pagamento_causale)}
                      title="Copia causale"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              {paymentInfo.pagamento_note && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{paymentInfo.pagamento_note}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Abbonamento info */}
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Abbonamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(abbonamenti || []).length > 0 ? (
                abbonamenti!.map((abb) => (
                  <div key={abb.id} className="space-y-2 text-sm p-3 rounded-lg bg-muted/50">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Corso</span>
                      <span className="font-medium">{abb.corso}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stagione</span>
                      <span>{abb.stagione}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Importo</span>
                      <span>€ {Number(abb.importo_totale).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stato</span>
                      <Badge variant={abb.stato_pagamento === "Pagato" ? "default" : "secondary"}>
                        {abb.stato_pagamento}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nessun abbonamento attivo</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pagamenti */}
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Pagamenti Effettuati
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(movimenti || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun pagamento registrato</p>
              ) : (
                movimenti!.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div>
                      <span className="text-sm">{m.categoria}</span>
                      {m.note && <p className="text-xs text-muted-foreground">{m.note}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">
                        € {Number(m.importo).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                      </span>
                      <p className="text-xs text-muted-foreground">{format(parseISO(m.data), "dd/MM/yyyy")}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Comunicazioni */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Comunicazioni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(comunicazioni || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna comunicazione</p>
            ) : (
              comunicazioni!.map((c) => (
                <div key={c.id} className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{c.oggetto}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(c.created_at), "dd/MM/yyyy", { locale: it })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{c.messaggio}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
