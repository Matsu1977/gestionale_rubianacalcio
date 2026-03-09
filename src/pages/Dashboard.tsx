import { motion } from "framer-motion";
import {
  Users,
  IdCard,
  CalendarCheck,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function Dashboard() {
  const { data: persone } = useQuery({
    queryKey: ["persone-count"],
    queryFn: async () => {
      const { data } = await supabase.from("persone").select("id, certificato_medico_scadenza");
      return data || [];
    },
  });

  const { data: tesseramenti } = useQuery({
    queryKey: ["tesseramenti-dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("tesseramenti").select("*");
      return data || [];
    },
  });

  const { data: abbonamenti } = useQuery({
    queryKey: ["abbonamenti-dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("abbonamenti").select("*");
      return data || [];
    },
  });

  const { data: rate } = useQuery({
    queryKey: ["rate-dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("rate").select("*");
      return data || [];
    },
  });

  const { data: movimenti } = useQuery({
    queryKey: ["movimenti-dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("movimenti").select("*").order("data", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: allMovimenti } = useQuery({
    queryKey: ["movimenti-totals"],
    queryFn: async () => {
      const { data } = await supabase.from("movimenti").select("tipo, importo");
      return data || [];
    },
  });

  const { data: personeMap } = useQuery({
    queryKey: ["persone-map"],
    queryFn: async () => {
      const { data } = await supabase.from("persone").select("id, nome, cognome");
      const map: Record<string, string> = {};
      (data || []).forEach((p) => { map[p.id] = `${p.nome} ${p.cognome}`; });
      return map;
    },
  });

  const tesseramentiAttivi = (tesseramenti || []).filter((t) => t.stato === "Attivo").length;
  const abbAttivi = (abbonamenti || []).filter((a) => a.stato_pagamento !== "Pagato").length;

  const totEntrate = (allMovimenti || []).filter((m) => m.tipo === "Entrata").reduce((s, m) => s + Number(m.importo), 0);
  const totUscite = (allMovimenti || []).filter((m) => m.tipo === "Uscita").reduce((s, m) => s + Number(m.importo), 0);
  const saldo = totEntrate - totUscite;

  const stats = [
    {
      title: "Tesserati Attivi",
      value: String(tesseramentiAttivi),
      icon: IdCard,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Persone Registrate",
      value: String((persone || []).length),
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Abbonamenti Attivi",
      value: String(abbAttivi),
      icon: CalendarCheck,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Saldo Cassa",
      value: `€ ${saldo.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  // Alerts
  const today = new Date();
  const in30days = addDays(today, 30);
  const todayStr = format(today, "yyyy-MM-dd");
  const in30Str = format(in30days, "yyyy-MM-dd");

  const certScadenza = (persone || []).filter(
    (p) => p.certificato_medico_scadenza && p.certificato_medico_scadenza <= in30Str && p.certificato_medico_scadenza >= todayStr
  ).length;

  const certScaduti = (persone || []).filter(
    (p) => p.certificato_medico_scadenza && p.certificato_medico_scadenza < todayStr
  ).length;

  const rateScadute = (rate || []).filter(
    (r) => r.stato === "Non pagata" && r.data_scadenza < todayStr
  ).length;

  const tessRinnovo = (tesseramenti || []).filter(
    (t) => t.data_fine && t.data_fine <= in30Str && t.stato === "Attivo"
  ).length;

  const alerts: { text: string; type: string; icon: typeof AlertCircle }[] = [];
  if (certScaduti > 0) alerts.push({ text: `${certScaduti} certificati medici scaduti`, type: "destructive", icon: AlertCircle });
  if (certScadenza > 0) alerts.push({ text: `${certScadenza} certificati medici in scadenza (30gg)`, type: "warning", icon: AlertCircle });
  if (rateScadute > 0) alerts.push({ text: `${rateScadute} rate abbonamento scadute`, type: "destructive", icon: Clock });
  if (tessRinnovo > 0) alerts.push({ text: `${tessRinnovo} tesseramenti da rinnovare`, type: "warning", icon: IdCard });

  const recentMovements = (movimenti || []).map((m) => ({
    desc: m.persona_id && personeMap ? `${m.categoria} - ${personeMap[m.persona_id] || ""}` : m.riferimento ? `${m.note || m.categoria} - ${m.riferimento}` : m.note || m.categoria,
    amount: `${m.tipo === "Entrata" ? "+" : "-"}€ ${Number(m.importo).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`,
    type: m.tipo === "Entrata" ? "entrata" : "uscita",
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Panoramica della stagione 2025/2026
        </p>
      </div>

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="glass-card hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Avvisi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun avviso</p>
              ) : (
                alerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <alert.icon
                      className={`h-4 w-4 shrink-0 ${alert.type === "destructive" ? "text-destructive" : "text-warning"}`}
                    />
                    <span className="text-sm">{alert.text}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ultimi Movimenti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentMovements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun movimento registrato</p>
              ) : (
                recentMovements.map((mov, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <span className="text-sm">{mov.desc}</span>
                    <span className={`text-sm font-semibold ${mov.type === "entrata" ? "text-success" : "text-destructive"}`}>
                      {mov.amount}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
