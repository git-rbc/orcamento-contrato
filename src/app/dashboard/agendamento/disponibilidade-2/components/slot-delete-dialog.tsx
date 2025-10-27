"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteAvailability } from "../utils/actions";
import { toast } from "sonner";

type DeleteSlotDialogProps = {  
    open: boolean;
    onClose: () => void;
    slotId: string;
    onDeleted: () => void;
};

export function SlotDeleteDialog({ open, onClose, slotId, onDeleted }: DeleteSlotDialogProps) {

    const handleDelete = async () => {
        const { error } = await deleteAvailability({ id: slotId});

        if(!error){
            toast.success("Disponibilidade removida com sucesso!");
            onDeleted();
            onClose();
            return;
        }

        toast.error(error.message);
    }

    return (  
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>  
                    <DialogTitle>Remover Disponibilidade</DialogTitle>
                </DialogHeader>
                <DialogDescription>  
                    Está ação não pode ser revertida e irá remover a disponibilidade permanentemente do sistema.
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
