import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, ShieldCheck, ShieldX, Minus } from "lucide-react";
import { format, parseISO, isBefore, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function IstruttoreDashboard() {
  const { user } = useAuth();

  // Persona collegata all'utente loggato
  const { data: persona } = useQuery({
    queryKey: ["istruttore-persona", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("persone").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  // Corsi insegnati dall'istruttore
  const { data: corsiInsegnati = [] } = useQuery({
    queryKey: ["istruttore-corsi", persona?.id],
    enabled: !!persona,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("istruttore_corsi")
        .select("corso:corsi(id, nome)")
        .eq("persona_id", persona!.id);
      if (error) throw error;
      return (data || []).map((ic: any) => ic.corso).filter(Boolean);
    },
  });

  const corsoIds = corsiInsegnati.map((c: any) => c.id);

  // Iscritti ai corsi dell'istruttore
  const { data: iscritti = [] } = useQuery({
    queryKey: ["istruttore-iscritti", corsoIds.join(",")],
    enabled: corsoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("persona_corsi")
        .select("corso_id, persona:persone(id, nome, cognome, certificato_medico_scadenza)")
        .in("corso_id", corsoIds);
      if (error) throw error;
      return data || [];
    },
  });

  if (!persona) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Area Istruttore</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Il tuo account non è ancora collegato a un profilo. Contatta la segreteria.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date();
  const warningDate = addDays(today, 30);

  // Raggruppa iscritti per corso
  const iscrittiPerCorso = corsiInsegnati.map((corso: any) => ({
    corso,
    persone: iscritti
      .filter((i: any) => i.corso_id === corso.id)
      .map((i: any) => i.persona)
      .filter(Boolean),
  }));

  // Tutti gli iscritti con CM scaduto o in scadenza
  const allPersone = iscritti.map((i: any) => i.persona).filter(Boolean);
  const certAlert = allPersone.filter((p: any) => {
    if (!p.certificato_medico_scadenza) return false;
    return isBefore(parseISO(p.certificato_medico_scadenza), warningDate);
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Area Istruttore</h1>
        <p className="text-muted-foreground mt-1">Benvenuto, {persona.nome} {persona.cognome}</p>
      </div>

      <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">

        {/* Alert certificati */}
        {certAlert.length > 0 && (
          <motion.div variants={item}>
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                  <ShieldX className="h-5 w-5" />
                  Certificati Medici in scadenza o scaduti ({certAlert.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {certAlert.map((p: any) => {
                  const scaduto = isBefore(parseISO(p.certificato_medico_scadenza), today);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-background text-sm">
                      <span className="font-medium">{p.cognome} {p.nome}</span>
                      <Badge variant={scaduto ? "destructive" : "outline"} className={!scaduto ? "border-amber-500 text-amber-700" : ""}>
                        {scaduto ? "Scaduto" : "In scadenza"} · {format(parseISO(p.certificato_medico_scadenza), "dd/MM/yyyy")}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Iscritti per corso */}
        {iscrittiPerCorso.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-sm">Nessun corso assegnato. Contatta la segreteria.</p>
            </CardContent>
          </Card>
        ) : (
          iscrittiPerCorso.map(({ corso, persone }: any) => (
            <motion.div key={corso.id} variants={item}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {corso.nome}
                    <Badge variant="outline" className="ml-2">{persone.length} iscritti</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {persone.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun iscritto</p>
                  ) : (
                    persone.map((p: any) => {
                      const certScadenza = p.certificato_medico_scadenza;
                      const scaduto = certScadenza ? isBefore(parseISO(certScadenza), today) : null;
                      const inScadenza = certScadenza ? isBefore(parseISO(certScadenza), warningDate) : null;
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                          <span className="font-medium">{p.cognome} {p.nome}</span>
                          {certScadenza === null ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-4 w-4" /> N/D</span>
                            ) : scaduto ? (
                            <Badge variant="destructive" className="text-xs">Scaduto · {format(parseISO(certScadenza), "dd/MM/yyyy")}</Badge>
                          ) : inScadenza ? (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-700">In scadenza · {format(parseISO(certScadenza), "dd/MM/yyyy")}</Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600"><ShieldCheck className="h-4 w-4" /> {format(parseISO(certScadenza), "dd/MM/yyyy")}</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}