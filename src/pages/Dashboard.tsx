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

const stats = [
  {
    title: "Tesserati Attivi",
    value: "127",
    change: "+12",
    trend: "up" as const,
    icon: IdCard,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Persone Registrate",
    value: "284",
    change: "+5",
    trend: "up" as const,
    icon: Users,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    title: "Abbonamenti Attivi",
    value: "89",
    change: "-3",
    trend: "down" as const,
    icon: CalendarCheck,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    title: "Saldo Cassa",
    value: "€ 14.250",
    change: "+€ 1.200",
    trend: "up" as const,
    icon: Wallet,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

const alerts = [
  { text: "12 certificati medici in scadenza", type: "warning", icon: AlertCircle },
  { text: "5 rate abbonamento scadute", type: "destructive", icon: Clock },
  { text: "3 tesseramenti da rinnovare", type: "warning", icon: IdCard },
];

const recentMovements = [
  { desc: "Quota iscrizione - Marco Rossi", amount: "+€ 150", type: "entrata" },
  { desc: "Affitto campo", amount: "-€ 300", type: "uscita" },
  { desc: "Abbonamento corso - Luca Bianchi", amount: "+€ 200", type: "entrata" },
  { desc: "Materiale sportivo", amount: "-€ 85", type: "uscita" },
  { desc: "Quota sociale - Anna Verdi", amount: "+€ 50", type: "entrata" },
];

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
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Panoramica della stagione 2025/2026
        </p>
      </div>

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
                    <div className="flex items-center gap-1 mt-2">
                      {stat.trend === "up" ? (
                        <TrendingUp className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          stat.trend === "up"
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {stat.change}
                      </span>
                    </div>
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
        {/* Alerts */}
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Avvisi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <alert.icon
                    className={`h-4 w-4 shrink-0 ${
                      alert.type === "destructive"
                        ? "text-destructive"
                        : "text-warning"
                    }`}
                  />
                  <span className="text-sm">{alert.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Movements */}
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ultimi Movimenti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentMovements.map((mov, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm">{mov.desc}</span>
                  <span
                    className={`text-sm font-semibold ${
                      mov.type === "entrata"
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {mov.amount}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
