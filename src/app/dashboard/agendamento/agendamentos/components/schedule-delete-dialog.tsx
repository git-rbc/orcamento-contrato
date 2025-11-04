"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Schedule } from "../types/schedule";
import { Button } from "@/components/ui/button";
import { deleteSchedule } from "../utils/actions";
import { useState } from "react";
import { toast } from "sonner";
import { DialogClose } from "@radix-ui/react-dialog";
import { Trash } from "lucide-react";

export function ScheduleDeleteDialog({
    schedule,
    onSuccess,
    defaultOpen,
    onClose,
} : {
    schedule: Schedule;
    onSuccess?: () => void;
    defaultOpen?: boolean;
    onClose?: () => void;
}) {
    const [open, setOpen] = useState(defaultOpen ?? false);

    const handleDelete = async () => {
        const { error } = await deleteSchedule({ id: schedule.id});

        if(!error){
            toast.success("Agendamento removido com sucesso!");
            setOpen(false);
            onClose?.();
            onSuccess?.();
            return;
        }

        toast.error(error.message);
    }

    return(
        <Dialog
            open={open}
            onOpenChange={(open) => {
                setOpen(open);
                onClose?.();
            }}
        >
            <DialogTrigger asChild>
                {!defaultOpen ? (
                    <Button variant="destructive" size="icon">
                        <Trash/>
                    </Button>
                ) : null}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Você tem certeza disso?
                    </DialogTitle>
                    <DialogDescription>
                        Está ação não pode ser revertida e irá remover o agendamento permanentemente do sistema.
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