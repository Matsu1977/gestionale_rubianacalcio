import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KEY = "pagamento_online_attivo";

export function usePagamentoOnline() {
  const { data, isLoading } = useQuery({
    queryKey: ["impostazione", KEY],
    queryFn: async () => {
      const { data } = await supabase
        .from("impostazioni_generali")
        .select("valore")
        .eq("chiave", KEY)
        .maybeSingle();
      return data?.valore === "true";
    },
  });
  return { attivo: !!data, isLoading };
}

export function useTogglePagamentoOnline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attivo: boolean) => {
      const { error } = await supabase
        .from("impostazioni_generali")
        .update({ valore: attivo ? "true" : "false", updated_at: new Date().toISOString() })
        .eq("chiave", KEY);
      if (error) throw error;
    },
    onSuccess: (_, attivo) => {
      qc.invalidateQueries({ queryKey: ["impostazione", KEY] });
      toast.success(`Pagamento online ${attivo ? "attivato" : "disattivato"}`);
    },
    onError: () => toast.error("Errore aggiornamento impostazione"),
  });
}
