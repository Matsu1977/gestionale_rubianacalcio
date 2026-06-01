import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  tesseramento: Tables<"tesseramenti"> | null;
  personaNome: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export default function DeleteTesseramentoDialog({ tesseramento, personaNome, onOpenChange, onConfirm, isDeleting }: Props) {
  return (
    <AlertDialog open={!!tesseramento} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare il tesseramento?</AlertDialogTitle>
          <AlertDialogDescription>
            Stai per eliminare il tesseramento di <strong>{personaNome}</strong> per la stagione <strong>{tesseramento?.stagione}</strong>. Questa azione è irreversibile.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isDeleting ? "Eliminazione..." : "Elimina"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
