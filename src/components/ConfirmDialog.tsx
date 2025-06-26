import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  children,
  title = "Confirmar Ação",
  description = "Tem certeza que deseja continuar?",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md animate-in fade-in-0 zoom-in-95 z-[9999]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() =>
              document.activeElement &&
              (document.activeElement as HTMLElement).blur()
            }
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="hover:cursor-pointer"
            onClick={() => {
              onConfirm();
              (document.activeElement as HTMLElement | null)?.blur();
            }}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
