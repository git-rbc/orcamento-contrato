"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PreVendor } from "../types/preVendor";
import { Button } from "@/components/ui/button";
import { deletePreVendor } from "../utils/actions";
import { useState } from "react";
import { toast } from "sonner";
import { DialogClose } from "@radix-ui/react-dialog";
import { Trash } from "lucide-react";

export function PreVendorDeleteDialog({
    prevendor
} : {
    prevendor: PreVendor;
}) {
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        const { error } = await deletePreVendor({ id: prevendor.id });

        if (!error) {
            toast.success("Pré-vendedor removido com sucesso!");
            setOpen(false);
            return;
        }

        toast.error(error.message);
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                <Button variant="destructive" size="icon">
                    <Trash/>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Você tem certeza disso?
                    </DialogTitle>
                    <DialogDescription>
                        Está ação não pode ser revertida e irá remover o pré-vendedor permanentemente do sistema.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleDelete}>
                        Remover
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}