"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteAvailability } from "../utils/actions";
import { toast } from "sonner";

type DeleteSlotDialogProps = {  
    open: boolean;
    onClose: () => void;
    slotId: string;
    onDeleted: () => void;
};

export function DeleteSlotDialog({ open, onClose, slotId, onDeleted }: DeleteSlotDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        const { error } = await deleteAvailability({ id: slotId});
        setLoading(false);

        if(!error){
            toast.success("Slot removido com sucesso!");
            onDeleted();
            onClose();
            return;
        }

        toast.error(error.message);
    }

    return (  
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>  
                    <DialogTitle>Excluir disponibilidade</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">  
                    Tem certeza que deseja excluir esta disponibilidade? Essa ação não pode ser desfeita.
                </p>
                <DialogFooter className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? "Excluindo..." : "Excluir"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
