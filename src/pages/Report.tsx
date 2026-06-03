import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Users, CreditCard, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(152, 45%, 22%)",
  "hsl(42, 80%, 55%)",
  "hsl(200, 60%, 50%)",
  "hsl(340, 60%, 50%)",
  "hsl(270, 50%, 55%)",
  "hsl(30, 70%, 50%)",
  "hsl(170, 50%, 40%)",
  "hsl(0, 60%, 55%)",
];

type PeriodFilter = "all" | "month" | "year" | "custom";

export default function Report() {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState(() => format(new Date(), "yyyy"));
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const { data: movimenti = [] } = useQuery({
    queryKey: ["report-movimenti"],
    queryFn: async () => {
      const { data, error } = await supabase.from("movimenti").select("*").order("data", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: abbonamenti = [] } = useQuery({
    queryKey: ["report-abbonamenti"],
    queryFn: async () => {
      const { data, error } = await supabase.from("abbonamenti").select("*, persone(nome, cognome)");
      if (error) throw error;
      return data;
    },
  });

  const { data: rate = [] } = useQuery({
    queryKey: ["report-rate"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rate").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: tesseramenti = [] } = useQuery({
    queryKey: ["report-tesseramenti"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tesseramenti").select("*, persone(nome, cognome)").order("data_inizio", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filteredMovimenti = useMemo(() => {
    return movimenti.filter((m) => {
      const d = parseISO(m.data);
      if (periodFilter === "month") {
        const [y, mo] = selectedMonth.split("-").map(Number);
        const start = startOfMonth(new Date(y, mo - 1));
        const end = endOfMonth(new Date(y, mo - 1));
        return isWithinInterval(d, { start, end });
      }
      if (periodFilter === "year") {
        return d.getFullYear().toString() === selectedYear;
      }
      if (periodFilter === "custom" && customFrom && customTo) {
        return isWithinInterval(d, { start: customFrom, end: customTo });
      }
      return true;
    });
  }, [movimenti, periodFilter, selectedMonth, selectedYear, customFrom, customTo]);

  const filteredTesseramenti = useMemo(() => {
    return tesseramenti.filter((t) => {
      const d = parseISO(t.data_inizio);
      if (periodFilter === "month") {
        const [y, mo] = selectedMonth.split("-").map(Number);
        const start = startOfMonth(new Date(y, mo - 1));
        const end = endOfMonth(new Date(y, mo - 1));
        return isWithinInterval(d, { start, end });
      }
      if (periodFilter === "year") {
        return d.getFullYear().toString() === selectedYear;
      }
      if (periodFilter === "custom" && customFrom && customTo) {
        return isWithinInterval(d, { start: customFrom, end: customTo });
      }
      return true;
    });
  }, [tesseramenti, periodFilter, selectedMonth, selectedYear, customFrom, customTo]);

  // --- Entrate ---
  const entrate = filteredMovimenti.filter((m) => m.tipo === "Entrata");
  const totaleEntrate = entrate.reduce((s, m) => s + Number(m.importo), 0);
  const entratePerCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    entrate.forEach((m) => { map[m.categoria] = (map[m.categoria] || 0) + Number(m.importo); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [entrate]);
  const entratePerMese = useMemo(() => {
    const map: Record<string, number> = {};
    entrate.forEach((m) => {
      const key = format(parseISO(m.data), "MMM yyyy", { locale: it });
      map[key] = (map[key] || 0) + Number(m.importo);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [entrate]);

  // --- Uscite ---
  const uscite = filteredMovimenti.filter((m) => m.tipo === "Uscita");
  const totaleUscite = uscite.reduce((s, m) => s + Number(m.importo), 0);
  const uscitePerCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    uscite.forEach((m) => { map[m.categoria] = (map[m.categoria] || 0) + Number(m.importo); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [uscite]);
  const uscitePerMese = useMemo(() => {
    const map: Record<string, number> = {};
    uscite.forEach((m) => {
      const key = format(parseISO(m.data), "MMM yyyy", { locale: it });
      map[key] = (map[key] || 0) + Number(m.importo);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [uscite]);

  // --- Abbonamenti ---
  const abbonamentiAttivi = abbonamenti.filter((a) => a.stato_pagamento !== "Scaduto");
  const abbonamentiScaduti = abbonamenti.filter((a) => a.stato_pagamento === "Scaduto");
  const ratePagate = rate.filter((r) => r.stato === "Pagata");
  const rateDaPagare = rate.filter((r) => r.stato !== "Pagata");

  // --- Tesserati ---
  const tesseratiAttivi = filteredTesseramenti.filter((t) => t.stato === "Attivo");
  const tesseratiPerMese = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTesseramenti.forEach((t) => {
      const key = format(parseISO(t.data_inizio), "MMM yyyy", { locale: it });
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTesseramenti]);

  const years = useMemo(() => {
    const s = new Set<string>();
    movimenti.forEach((m) => s.add(parseISO(m.data).getFullYear().toString()));
    tesseramenti.forEach((t) => s.add(parseISO(t.data_inizio).getFullYear().toString()));
    if (s.size === 0) s.add(new Date().getFullYear().toString());
    return Array.from(s).sort();
  }, [movimenti, tesseramenti]);

  const months = useMemo(() => {
    const result: { value: string; label: string }[] = [];
    for (let i = 0; i < 24; i++) {
      const d = subMonths(new Date(), i);
      result.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: it }) });
    }
    return result;
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Report
          </h1>
          <p className="text-sm text-muted-foreground">Statistiche, report finanziari e analisi dati</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i periodi</SelectItem>
              <SelectItem value="month">Mese</SelectItem>
              <SelectItem value="year">Anno</SelectItem>
              <SelectItem value="custom">Intervallo</SelectItem>
            </SelectContent>
          </Select>
          {periodFilter === "month" && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {periodFilter === "year" && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {periodFilter === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[130px] text-left text-sm", !customFrom && "text-muted-foreground")}>
                    <Calendar className="mr-1 h-3 w-3" />
                    {customFrom ? format(customFrom, "dd/MM/yyyy") : "Da"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" /></PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[130px] text-left text-sm", !customTo && "text-muted-foreground")}>
                    <Calendar className="mr-1 h-3 w-3" />
                    {customTo ? format(customTo, "dd/MM/yyyy") : "A"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="riepilogo" className="space-y-4">
  <TabsList className="grid w-full grid-cols-5">
    <TabsTrigger value="riepilogo" className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Riepilogo</TabsTrigger>
    <TabsTrigger value="entrate" className="flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Entrate</TabsTrigger>
    <TabsTrigger value="uscite" className="flex items-center gap-1"><TrendingDown className="h-4 w-4" /> Uscite</TabsTrigger>
    <TabsTrigger value="abbonamenti" className="flex items-center gap-1"><CreditCard className="h-4 w-4" /> Abbonamenti</TabsTrigger>
    <TabsTrigger value="tesserati" className="flex items-center gap-1"><Users className="h-4 w-4" /> Tesserati</TabsTrigger>
  </TabsList>

  {/* RIEPILOGO */}
  <TabsContent value="riepilogo" className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><CardContent className="pt-6 text-center">
        <p className="text-sm text-muted-foreground">Totale Entrate</p>
        <p className="text-3xl font-bold text-primary">{fmt(totaleEntrate)}</p>
      </CardContent></Card>
      <Card><CardContent className="pt-6 text-center">
        <p className="text-sm text-muted-foreground">Totale Uscite</p>
        <p className="text-3xl font-bold text-destructive">{fmt(totaleUscite)}</p>
      </CardContent></Card>
      <Card><CardContent className="pt-6 text-center">
        <p className="text-sm text-muted-foreground">Saldo</p>
        <p className={`text-3xl font-bold ${totaleEntrate - totaleUscite >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(totaleEntrate - totaleUscite)}</p>
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="text-base">Entrate vs Uscite per Mese</CardTitle></CardHeader><CardContent className="h-[400px]">
      {filteredMovimenti.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={(() => {
            const map: Record<string, { name: string; entrate: number; uscite: number }> = {};
            filteredMovimenti.forEach((m) => {
              const key = format(parseISO(m.data), "MMM yyyy", { locale: it });
              if (!map[key]) map[key] = { name: key, entrate: 0, uscite: 0 };
              if (m.tipo === "Entrata") map[key].entrate += Number(m.importo);
              else map[key].uscite += Number(m.importo);
            });
            return Object.values(map);
          })()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Bar dataKey="entrate" name="Entrate" fill="hsl(152, 45%, 22%)" radius={[4,4,0,0]} />
            <Bar dataKey="uscite" name="Uscite" fill="hsl(0, 72%, 51%)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <p className="text-muted-foreground text-center pt-20">Nessun dato disponibile</p>}
    </CardContent></Card>
  </TabsContent>

        {/* ENTRATE */}
        <TabsContent value="entrate" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Totale Entrate</p>
              <p className="text-3xl font-bold text-green-500">{fmt(totaleEntrate)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">N. Movimenti</p>
              <p className="text-3xl font-bold text-foreground">{entrate.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Media per Movimento</p>
              <p className="text-3xl font-bold text-foreground">{entrate.length ? fmt(totaleEntrate / entrate.length) : "—"}</p>
            </CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">Entrate per Mese</CardTitle></CardHeader><CardContent className="h-[300px]">
              {entratePerMese.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={entratePerMese}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={(v: number) => fmt(v)} /><Bar dataKey="value" fill="hsl(152, 45%, 22%)" radius={[4,4,0,0]} /></BarChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-center pt-20">Nessun dato</p>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Entrate per Categoria</CardTitle></CardHeader><CardContent className="h-[300px]">
              {entratePerCategoria.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={entratePerCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {entratePerCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip formatter={(v: number) => fmt(v)} /></PieChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-center pt-20">Nessun dato</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        {/* USCITE */}
        <TabsContent value="uscite" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Totale Uscite</p>
              <p className="text-3xl font-bold text-destructive">{fmt(totaleUscite)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">N. Movimenti</p>
              <p className="text-3xl font-bold text-foreground">{uscite.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Media per Movimento</p>
              <p className="text-3xl font-bold text-foreground">{uscite.length ? fmt(totaleUscite / uscite.length) : "—"}</p>
            </CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">Uscite per Mese</CardTitle></CardHeader><CardContent className="h-[300px]">
              {uscitePerMese.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={uscitePerMese}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={(v: number) => fmt(v)} /><Bar dataKey="value" fill="hsl(0, 72%, 51%)" radius={[4,4,0,0]} /></BarChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-center pt-20">Nessun dato</p>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Uscite per Categoria</CardTitle></CardHeader><CardContent className="h-[300px]">
              {uscitePerCategoria.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={uscitePerCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {uscitePerCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip formatter={(v: number) => fmt(v)} /></PieChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-center pt-20">Nessun dato</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        {/* ABBONAMENTI */}
        <TabsContent value="abbonamenti" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Totale Abbonamenti</p>
              <p className="text-3xl font-bold text-foreground">{abbonamenti.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Attivi</p>
              <p className="text-3xl font-bold text-primary">{abbonamentiAttivi.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Rate Pagate</p>
              <p className="text-3xl font-bold text-primary">{ratePagate.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Rate da Pagare</p>
              <p className="text-3xl font-bold text-destructive">{rateDaPagare.length}</p>
            </CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">Stato Abbonamenti</CardTitle></CardHeader><CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={[
                  { name: "Attivi", value: abbonamentiAttivi.length },
                  { name: "Scaduti", value: abbonamentiScaduti.length },
                ].filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="hsl(152, 45%, 22%)" />
                  <Cell fill="hsl(0, 72%, 51%)" />
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Stato Rate</CardTitle></CardHeader><CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={[
                  { name: "Pagate", value: ratePagate.length },
                  { name: "Da pagare", value: rateDaPagare.length },
                ].filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="hsl(152, 45%, 22%)" />
                  <Cell fill="hsl(42, 80%, 55%)" />
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </div>
        </TabsContent>

        {/* TESSERATI */}
        <TabsContent value="tesserati" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Totale Tesserati</p>
              <p className="text-3xl font-bold text-foreground">{filteredTesseramenti.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Tesserati Attivi</p>
              <p className="text-3xl font-bold text-primary">{tesseratiAttivi.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Categorie</p>
              <p className="text-3xl font-bold text-foreground">{new Set(filteredTesseramenti.map(t => t.tipo_tesseramento)).size}</p>
            </CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-base">Nuovi Tesserati per Mese</CardTitle></CardHeader><CardContent className="h-[300px]">
            {tesseratiPerMese.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tesseratiPerMese}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="value" stroke="hsl(152, 45%, 22%)" strokeWidth={2} dot={{ r: 4 }} /></LineChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center pt-20">Nessun dato</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
