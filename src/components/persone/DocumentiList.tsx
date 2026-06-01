import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  personaId: string;
}

export default function DocumentiList({ personaId }: Props) {
  const queryClient = useQueryClient();

  const { data: documenti = [] } = useQuery({
    queryKey: ["documenti-firmati", personaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documenti_firmati")
        .select("*")
        .eq("persona_id", personaId)
        .order("data_firma", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      await supabase.storage.from("documenti-firmati").remove([filePath]);
      const { error } = await supabase.from("documenti_firmati").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documenti-firmati", personaId] });
      toast.success("Documento eliminato");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const downloadFile = (filePath: string, tipoDoc: string) => {
    const { data } = supabase.storage.from("documenti-firmati").getPublicUrl(filePath);
    const link = document.createElement("a");
    link.href = data.publicUrl;
    link.download = `${tipoDoc.replace(/\s/g, "_")}.pdf`;
    link.target = "_blank";
    link.click();
  };

  if (documenti.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-muted-foreground">
        <FileText className="h-7 w-7 mb-2" />
        <p className="text-sm">Nessun documento firmato</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Documento</TableHead>
          <TableHead>Data firma</TableHead>
          <TableHead>Firmato da</TableHead>
          <TableHead className="w-[100px]">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documenti.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {doc.tipo_documento}
              </Badge>
            </TableCell>
            <TableCell className="text-xs">
              {new Date(doc.data_firma).toLocaleDateString("it-IT", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </TableCell>
            <TableCell className="text-xs font-medium">{doc.nome_persona}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadFile(doc.file_path, doc.tipo_documento)}>
                  <Download className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate({ id: doc.id, filePath: doc.file_path })}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
