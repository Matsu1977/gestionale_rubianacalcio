import type { Tables } from "@/integrations/supabase/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Receipt } from "lucide-react";

type Movimento = Tables<"movimenti">;

interface Props {
  movimenti: Movimento[];
  onDelete?: (id: string) => void;
}

export default function PaymentHistoryTable({ movimenti, onDelete }: Props) {
  if (movimenti.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-muted-foreground">
        <Receipt className="h-6 w-6 mb-2" />
        <p className="text-sm">Nessun pagamento registrato</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Metodo</TableHead>
          <TableHead className="text-right">Importo</TableHead>
          {onDelete && <TableHead className="w-10"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {movimenti.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="text-xs">{new Date(m.data).toLocaleDateString("it-IT")}</TableCell>
            <TableCell className="text-xs">{m.metodo_pagamento}</TableCell>
            <TableCell className="text-right font-medium text-xs">€{Number(m.importo).toFixed(2)}</TableCell>
            {onDelete && (
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(m.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
