"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Vendor } from "../types/vendor";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createVendor, updateVendor } from "../utils/actions";
import { useState } from "react";
import { toast } from "sonner";

export function VendorDialog({
  vendor
} : {
  vendor?: Vendor;
}) {
  const [open, setOpen] = useState(false);

  const formSchema = z.object({
    name: z.string({ message: "Insira um nome"}).nonempty({ message: "Insira um nome"}),
  });
  type formSchemaType = z.infer<typeof formSchema>;

  const form = useForm<formSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: vendor?.name ?? "",
    }
  });

  const onSubmit = async ({ name }: formSchemaType) => {
    let handler = createVendor({ name });
    let shouldReset = true;
    let message = "Vendedor criado com sucesso!";

    if (vendor?.id) {
      handler = updateVendor({ name, id: vendor.id });
      shouldReset = false;
      message = "Vendedor atualizado com sucesso!";
    }

    const { error } = await handler;

    if (!error) {
      if (shouldReset) form.reset();
      toast.success(message);
      setOpen(false);
      return;
    }
    
    toast.error(error.message);
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          {vendor ? "Atualizar" : "Criar"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {vendor ? "Atualizar" : "Criar"} Vendedor
          </DialogTitle>
          <DialogDescription>
            {vendor ? "Atualize as informações do Vendedor" : "Crie um novo Vendedor"} para utilizar nos agendamentos
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. João Pedro" {...field}/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">
                {vendor ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}