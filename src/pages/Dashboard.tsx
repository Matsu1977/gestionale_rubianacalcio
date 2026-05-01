import { useMemo } from "react";
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
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { format, addDays, parseISO, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { isStagioneAttiva, stagioneStatoMessage } from "@/lib/stagione";
import { PagamentoOnlineSwitchCard } from "@/components/dashboard/PagamentoOnlineSwitchCard";
import { Ticket } from "lucide-react";

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

const CHART_COLORS = {
  entrate: "hsl(152, 45%, 35%)",
  uscite: "hsl(0, 72%, 51%)",
  primary: "hsl(152, 45%, 22%)",
  accent: "hsl(42, 80%, 55%)",
  info: "hsl(200, 60%, 50%)",
  muted: "hsl(210, 10%, 70%)",
};

const PIE_COLORS = [
  "hsl(152, 45%, 35%)",
  "hsl(42, 80%, 55%)",
  "hsl(200, 60%, 50%)",
  "hsl(340, 60%, 50%)",
  "hsl(270, 50%, 55%)",
  "hsl(30, 70%, 50%)",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

export default function Dashboard() {
  const { role } = useAuth();
  const isAllenatore = role === "allenatore";
  const isAdmin = role === "admin";
  const stagioneAttiva = isStagioneAttiva();

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

  // Storico rate (mantenute solo per consultazione, non più per alert insoluti)
  const { data: rate } = useQuery({
    queryKey: ["rate-dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("rate").select("*");
      return data || [];
    },
  });

  // Tessere ingressi - per alert
  const { data: tessere } = useQuery({
    queryKey: ["tessere-dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("tessere_ingressi").select("*");
      return data || [];
    },
    enabled: !isAllenatore,
  });

  const { data: movimenti } = useQuery({
    queryKey: ["movimenti-dashboard"],
    queryFn: async () => {
      const { data } = await supabase.from("movimenti").select("*").order("data", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !isAllenatore,
  });

  const { data: allMovimenti } = useQuery({
    queryKey: ["movimenti-totals"],
    queryFn: async () => {
      const { data } = await supabase.from("movimenti").select("tipo, importo, data, categoria");
      return data || [];
    },
    enabled: !isAllenatore,
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

  // Chart data: Entrate/Uscite per mese (ultimi 6 mesi)
  const monthlyTrend = useMemo(() => {
    if (!allMovimenti || allMovimenti.length === 0) return [];
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      months.push({
        key: format(d, "yyyy-MM"),
        label: format(d, "MMM", { locale: it }),
      });
    }
    const map: Record<string, { entrate: number; uscite: number }> = {};
    months.forEach((m) => { map[m.key] = { entrate: 0, uscite: 0 }; });
    allMovimenti.forEach((m) => {
      const key = m.data.substring(0, 7);
      if (map[key]) {
        if (m.tipo === "Entrata") map[key].entrate += Number(m.importo);
        else map[key].uscite += Number(m.importo);
      }
    });
    return months.map((m) => ({
      name: m.label,
      Entrate: Math.round(map[m.key].entrate * 100) / 100,
      Uscite: Math.round(map[m.key].uscite * 100) / 100,
    }));
  }, [allMovimenti]);

  // Chart data: Stato pagamenti abbonamenti
  const abbonamentoStatusData = useMemo(() => {
    if (!abbonamenti || abbonamenti.length === 0) return [];
    const map: Record<string, number> = {};
    abbonamenti.forEach((a) => {
      map[a.stato_pagamento] = (map[a.stato_pagamento] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [abbonamenti]);

  // (rimosso "Stato Rate Pagamento": le rate non rappresentano più scadenze obbligatorie)

  // Chart data: Nuove iscrizioni per mese (ultimi 6 mesi)
  const iscrizioni = useMemo(() => {
    if (!tesseramenti || tesseramenti.length === 0) return [];
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      months.push({
        key: format(d, "yyyy-MM"),
        label: format(d, "MMM", { locale: it }),
      });
    }
    const map: Record<string, number> = {};
    months.forEach((m) => { map[m.key] = 0; });
    tesseramenti.forEach((t) => {
      const key = t.data_inizio.substring(0, 7);
      if (map[key] !== undefined) map[key]++;
    });
    return months.map((m) => ({ name: m.label, Iscrizioni: map[m.key] }));
  }, [tesseramenti]);

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
    ...(!isAllenatore ? [{
      title: "Saldo Cassa",
      value: `€ ${saldo.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    }] : []),
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

  // Tessere ingressi - alerts
  const tessereEsaurimento = (tessere || []).filter((t: any) => {
    const r = t.ingressi_totali - t.ingressi_usati;
    return r > 0 && r <= 2;
  }).length;
  const tessereEsaurite = (tessere || []).filter((t: any) => t.ingressi_totali - t.ingressi_usati <= 0).length;

  const alerts: { text: string; type: string; icon: typeof AlertCircle }[] = [];
  if (certScaduti > 0) alerts.push({ text: `${certScaduti} certificati medici scaduti`, type: "destructive", icon: AlertCircle });
  if (certScadenza > 0) alerts.push({ text: `${certScadenza} certificati medici in scadenza (30gg)`, type: "warning", icon: AlertCircle });
  // Avvisi abbonamenti/tesseramenti SOLO durante la stagione attiva (1 ott - 30 giu)
  if (stagioneAttiva && tessRinnovo > 0) alerts.push({ text: `${tessRinnovo} tesseramenti da rinnovare`, type: "warning", icon: IdCard });
  if (stagioneAttiva && tessereEsaurimento > 0) alerts.push({ text: `${tessereEsaurimento} tessere ingressi in esaurimento`, type: "warning", icon: AlertCircle });
  if (stagioneAttiva && tessereEsaurite > 0) alerts.push({ text: `${tessereEsaurite} tessere ingressi da rinnovare`, type: "destructive", icon: AlertCircle });
  if (!stagioneAttiva) alerts.push({ text: "Stagione sospesa: avvisi di scadenza disattivati fino al 1° ottobre", type: "warning", icon: Clock });
  // Le rate non sono più considerate insoluti automatici - rimosse dagli alert

  const recentMovements = (movimenti || []).map((m) => ({
    desc: m.persona_id && personeMap ? `${m.categoria} - ${personeMap[m.persona_id] || ""}` : m.riferimento ? `${m.note || m.categoria} - ${m.riferimento}` : m.note || m.categoria,
    amount: `${m.tipo === "Entrata" ? "+" : "-"}€ ${Number(m.importo).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`,
    type: m.tipo === "Entrata" ? "entrata" : "uscita",
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Panoramica della stagione 2025/2026
          </p>
        </div>
        {isAllenatore && <ChangePasswordDialog />}
      </div>

      {!stagioneAttiva && !isAllenatore && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <strong>Stagione sospesa</strong> — {stagioneStatoMessage()}. Da luglio a settembre i corsi sono sospesi: nessuna scadenza o avviso automatico viene generato.
        </div>
      )}

      {isAdmin && <PagamentoOnlineSwitchCard />}

      {/* Stats Cards */}
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

      {/* Charts Row */}
      {!isAllenatore && (
        <motion.div
          className="grid gap-6 lg:grid-cols-2"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Trend Entrate/Uscite */}
          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Andamento Entrate / Uscite (6 mesi)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                {monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrend} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,85%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="Entrate" fill={CHART_COLORS.entrate} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Uscite" fill={CHART_COLORS.uscite} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center pt-24 text-sm">Nessun movimento registrato</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Nuove Iscrizioni */}
          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-info" />
                  Nuove Iscrizioni (6 mesi)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                {iscrizioni.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={iscrizioni}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,85%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="Iscrizioni"
                        stroke={CHART_COLORS.info}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: CHART_COLORS.info }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center pt-24 text-sm">Nessun tesseramento registrato</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Pie Charts Row */}
      {!isAllenatore && (
        <motion.div
          className="grid gap-6 lg:grid-cols-2"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Stato Abbonamenti */}
          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-accent" />
                  Stato Abbonamenti
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px]">
                {abbonamentoStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={abbonamentoStatusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {abbonamentoStatusData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center pt-24 text-sm">Nessun abbonamento</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tessere Ingressi - panoramica */}
          <motion.div variants={item}>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-primary" />
                  Tessere Ingressi
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] flex flex-col justify-center gap-3">
                {(tessere || []).length === 0 ? (
                  <p className="text-muted-foreground text-center text-sm">Nessuna tessera attiva</p>
                ) : (
                  <>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">Tessere attive</span>
                      <span className="text-2xl font-bold">
                        {(tessere || []).filter((t: any) => t.ingressi_totali - t.ingressi_usati > 0).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-amber-500/10">
                      <span className="text-sm">In esaurimento (≤2)</span>
                      <span className="text-2xl font-bold text-amber-700">
                        {(tessere || []).filter((t: any) => {
                          const r = t.ingressi_totali - t.ingressi_usati;
                          return r > 0 && r <= 2;
                        }).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10">
                      <span className="text-sm">Esaurite</span>
                      <span className="text-2xl font-bold text-destructive">
                        {(tessere || []).filter((t: any) => t.ingressi_totali - t.ingressi_usati <= 0).length}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Alerts & Recent Movements */}
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

        {!isAllenatore && (
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
        )}
      </div>
    </div>
  );
}
