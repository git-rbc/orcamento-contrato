"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PreVendor } from "../types/preVendor";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createPreVendor, updatePreVendor } from "../utils/actions";
import { useState } from "react";
import { toast } from "sonner";

export function PreVendorDialog({
    prevendor
} : {
    prevendor?: PreVendor
}) {
    const [open, setOpen] = useState(false);

    const formSchema = z.object({
        name: z.string({message: "Insira um nome"}).nonempty({ message: "Insira um nome"}),
    });
    type formSchemaType = z.infer<typeof formSchema>;

    const form = useForm<formSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: prevendor?.name ?? "",
        }
    });

    const onSubmit = async ({ name }: formSchemaType) =>{
        let handler = createPreVendor({ name });
        let shouldReset = true;
        let message = "Pré-vendedor criado com sucesso!";

        if (prevendor?.id) {
            handler = updatePreVendor({ name, id: prevendor.id});
            shouldReset = false;
            message = "Pré-vendedor atualizado com sucesso!";
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
            <DialogTrigger>
                <Button>
                    {prevendor ? "Atualizar" : "Criar"}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {prevendor ? "Atualizar" : "Criar"} Pré-vendedor
                    </DialogTitle>
                    <DialogDescription>
                        {prevendor ? "Atualize as informações do Pré-vendedor" : " Crie um novo Pré-vendedor"} para utilizar nos agendamentos
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
                                {prevendor ? "Salvar" : "Criar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}