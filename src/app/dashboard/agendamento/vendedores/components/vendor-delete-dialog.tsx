"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Vendor } from "../types/vendor";
import { Button } from "@/components/ui/button";
import { deleteVendor } from "../utils/actions";
import { useState } from "react";
import { toast } from "sonner";
import { DialogClose } from "@radix-ui/react-dialog";
import { Trash } from "lucide-react";

export function VendorDeleteDialog({
  vendor
} : {
  vendor: Vendor;
}) {
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    const { error } = await deleteVendor({ id: vendor.id });

    if (!error) {
      toast.success("Vendedor removido com sucesso!");
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
            Está ação não pode ser revertida e irá remover o vendedor permanentemente do sistema.
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