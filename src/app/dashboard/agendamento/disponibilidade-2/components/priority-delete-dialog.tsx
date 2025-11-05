"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteAvailabilityPriority } from "../utils/actions";
import { toast } from "sonner";

type DeletePriorityDialogProps = {  
    open: boolean;
    onClose: () => void;
    priorityId: string;
    onDelete: () => void;
};

export function PriorityDeleteDialog({ open, onClose, priorityId, onDelete }: DeletePriorityDialogProps) {

    const handleDelete = async () => {
        const { error } = await deleteAvailabilityPriority({ id: priorityId});

        if(!error){
            toast.success("Reserva removida com sucesso!");
            onDelete();
            onClose();
            return;
        }

        toast.error(error.message);
    }

    return (  
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>  
                    <DialogTitle>Remover Reserva</DialogTitle>
                </DialogHeader>
                <DialogDescription>  
                    Está ação não pode ser revertida e irá remover a reserva permanentemente do sistema.
                </DialogDescription>
                <DialogFooter className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleDelete}>
                        Remover
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
