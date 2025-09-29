"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { City } from "../types/city";
import { Button } from "@/components/ui/button";
import { deleteCity } from "../utils/actions";
import { useState } from "react";
import { toast } from "sonner";
import { DialogClose } from "@radix-ui/react-dialog";
import { Trash } from "lucide-react";

export function CityDeleteDialog({
    city
} : {
    city: City;
}) {
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        const { error } = await deleteCity({ id: city.id});

        if(!error){
            toast.success("Cidade removida com sucesso!");
            setOpen(false);
            return;
        }

        toast.error(error.message);
    }

    return(
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
                        Está ação não pode ser revertida e irá remover a cidade permanentemente do sistema.
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