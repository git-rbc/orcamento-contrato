"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CityPlace } from "../types/cityPlace";
import { Button } from "@/components/ui/button";
import { deleteCityPlace } from "../utils/actions";
import { useState } from "react";
import { toast } from "sonner";
import { DialogClose } from "@radix-ui/react-dialog";
import { Trash } from "lucide-react";

export function CityPlaceDeleteDialog({
    cityPlace
} : {
    cityPlace: CityPlace;
}) {
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        const { error } = await deleteCityPlace({ id: cityPlace.id });

        if (!error) {
            toast.success("Local removido com sucesso!");
            setOpen(false);
            return;
        }
        
        toast.error(error.message);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
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
                        Está ação não pode ser revertida e irá remover o local permanentemente do sistema.
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