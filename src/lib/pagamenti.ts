import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Movimento = Tables<"movimenti">;

export type StatoPagamento = "Pagato" | "Parziale" | "Non pagato";

export function calcolaStatoPagamento(movimenti: Movimento[], importoTotale: number): { totalePagato: number; stato: StatoPagamento } {
  const totalePagato = movimenti.reduce((s, m) => s + Number(m.importo), 0);
  let stato: StatoPagamento = "Non pagato";
  if (totalePagato >= importoTotale && importoTotale > 0) stato = "Pagato";
  else if (totalePagato > 0) stato = "Parziale";
  return { totalePagato, stato };
}

export const STATO_COLORS: Record<StatoPagamento, string> = {
  "Pagato": "bg-green-500/15 text-green-700 border-green-500/30",
  "Parziale": "bg-amber-500/15 text-amber-700 border-amber-500/30",
  "Non pagato": "bg-red-500/15 text-red-700 border-red-500/30",
};

export async function fetchMovimentiByRiferimento(tipo: string, ids: string[]): Promise<Record<string, Movimento[]>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("movimenti")
    .select("*")
    .eq("riferimento_tipo", tipo)
    .in("riferimento_id", ids)
    .order("data", { ascending: false });
  if (error) throw error;
  const map: Record<string, Movimento[]> = {};
  for (const m of data) {
    const key = m.riferimento_id!;
    if (!map[key]) map[key] = [];
    map[key].push(m);
  }
  return map;
}
