import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isBefore, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface Rata {
  id: string;
  abbonamento_id: string;
  numero_rata: number;
  importo: number;
  data_scadenza: string;
  stato: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abbonamentoId: string | null;
  personaNome: string;
  corso: string;
  importoTotale: number;
  rate: Rata[];
  personaId: string;
}

const STATO_COLORS: Record<string, string> = {
  "Pagata": "bg-green-500/15 text-green-700 border-green-500/30",
  "Non pagata": "bg-muted text-muted-foreground border-border",
  "Scaduta": "bg-red-500/15 text-red-700 border-red-500/30",
};

const STATO_ICONS: Record<string, typeof CheckCircle> = {
  "Pagata": CheckCircle,
  "Non pagata": Clock,
  "Scaduta": XCircle,
};

export default function RateSheet({ open, onOpenChange, abbonamentoId, personaNome, corso, importoTotale, rate, personaId }: Props) {
  const queryClient = useQueryClient();
  const [metodo, setMetodo] = useState<string>("Contanti");
  const today = new Date();

  const totalePagato = rate.filter(r => r.stato === "Pagata").reduce((s, r) => s + Number(r.importo), 0);
  const residuo = importoTotale - totalePagato;

  // Mark scadute visually
  const rateWithStatus = rate.map(r => {
    if (r.stato === "Non pagata" && isBefore(parseISO(r.data_scadenza), today)) {
      return { ...r, displayStato: "Scaduta" };
    }
    return { ...r, displayStato: r.stato };
  });

  const pagaMutation = useMutation({
    mutationFn: async (rata: Rata) => {
      // Update rata stato
      const { error: rataErr } = await supabase.from("rate").update({ stato: "Pagata" }).eq("id", rata.id);
      if (rataErr) throw rataErr;

      // Create movimento
      const { error: movErr } = await supabase.from("movimenti").insert({
        tipo: "Entrata",
        categoria: "Abbonamento",
        importo: Number(rata.importo),
        metodo_pagamento: metodo as any,
        persona_id: personaId,
        riferimento_tipo: "abbonamento",
        riferimento_id: rata.abbonamento_id,
        riferimento: `Rata ${rata.numero_rata} - ${corso}`,
        note: `Pagamento rata ${rata.numero_rata}/${rate.length} per ${personaNome}`,
      });
      if (movErr) throw movErr;

      // Check if all rate are paid, update abbonamento stato
      const otherPaid = rate.filter(r => r.id !== rata.id && r.stato === "Pagata").length;
      const totalPaidAfter = otherPaid + 1;
      const newStato = totalPaidAfter === rate.length ? "Pagato" : "Parziale";
      await supabase.from("abbonamenti").update({ stato_pagamento: newStato }).eq("id", rata.abbonamento_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate"] });
      queryClient.invalidateQueries({ queryKey: ["abbonamenti"] });
      queryClient.invalidateQueries({ queryKey: ["movimenti-all"] });
      toast.success("Rata pagata e movimento registrato");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const updateScadenzaMutation = useMutation({
    mutationFn: async ({ rataId, newDate }: { rataId: string; newDate: Date }) => {
      const { error } = await supabase.from("rate").update({ data_scadenza: format(newDate, "yyyy-MM-dd") }).eq("id", rataId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate"] });
      toast.success("Scadenza aggiornata");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  // Alerts
  const rateScadute = rateWithStatus.filter(r => r.displayStato === "Scaduta");
  const rateInScadenza = rateWithStatus.filter(r => {
    if (r.stato !== "Non pagata") return false;
    const scad = parseISO(r.data_scadenza);
    return !isBefore(scad, today) && isBefore(scad, addDays(today, 7));
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Rate - {personaNome}</SheetTitle>
          <SheetDescription>{corso}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Totale</p>
              <p className="text-lg font-bold">€{importoTotale.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Pagato</p>
              <p className="text-lg font-bold text-green-600">€{totalePagato.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Residuo</p>
              <p className={cn("text-lg font-bold", residuo > 0 ? "text-red-600" : "text-green-600")}>€{residuo.toFixed(2)}</p>
            </div>
          </div>

          {/* Alerts */}
          {rateScadute.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{rateScadute.length} rat{rateScadute.length === 1 ? "a scaduta" : "e scadute"}</span>
            </div>
          )}
          {rateInScadenza.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{rateInScadenza.length} rat{rateInScadenza.length === 1 ? "a in scadenza" : "e in scadenza"} (entro 7 giorni)</span>
            </div>
          )}

          {/* Payment method selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Metodo pagamento:</span>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Contanti", "Bonifico", "Carta", "Satispay", "Altro"].map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rate table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateWithStatus.map((r) => {
                const Icon = STATO_ICONS[r.displayStato] || Clock;
                return (
                  <TableRow key={r.id} className={r.displayStato === "Scaduta" ? "bg-red-500/5" : ""}>
                    <TableCell className="font-medium">{r.numero_rata}</TableCell>
                    <TableCell>
                      {r.stato === "Pagata" ? (
                        <span className="text-sm">{format(parseISO(r.data_scadenza), "dd/MM/yyyy")}</span>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className={cn("h-8 px-2 text-sm", r.displayStato === "Scaduta" && "text-red-600")}>
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {format(parseISO(r.data_scadenza), "dd/MM/yyyy")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={parseISO(r.data_scadenza)}
                              onSelect={(date) => {
                                if (date) updateScadenzaMutation.mutate({ rataId: r.id, newDate: date });
                              }}
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", STATO_COLORS[r.displayStato] || "")}>
                        <Icon className="h-3 w-3 mr-1" />
                        {r.displayStato}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">€{Number(r.importo).toFixed(2)}</TableCell>
                    <TableCell>
                      {r.stato !== "Pagata" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={pagaMutation.isPending}
                          onClick={() => pagaMutation.mutate(r as any)}
                        >
                          Paga
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
