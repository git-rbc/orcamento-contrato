"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteAvailability } from "../utils/actions";

type DeleteSlotDialogProps = {  
    open: boolean;
    onClose: () => void;
    slotId: string;
    onDeleted: () => void;
};

export function DeleteSlotDialog({ open, onClose, slotId, onDeleted }: DeleteSlotDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>();

    const handleDelete = async () => {  
    try {
            setLoading(true);
            setError(undefined);
            await deleteAvailability(slotId);
            onDeleted();
            onClose();
    } catch (e: any) {
            setError(e.message || "Erro ao excluir disponibilidade");
    } finally {
            setLoading(false);
    }
    };

    return (  
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>  
                    <DialogTitle>Excluir disponibilidade</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">  
                    Tem certeza que deseja excluir esta disponibilidade? Essa ação não pode ser desfeita.
                </p>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
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
