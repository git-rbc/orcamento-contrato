"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { City } from "../types/city";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createCity, updateCity } from "../utils/actions";
import { useState } from "react";
import { toast } from "sonner";

export function CityDialog({
    city
} : {
    city?: City;
}){
    const [open, setOpen] = useState(false);

    const formSchema = z.object({
        name: z.string({ message: "Insira uma cidade"}).nonempty({ message: "Insira uma cidade"}),
    });
    type formSchemaType = z.infer<typeof formSchema>;

    const form = useForm<formSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name:city?.name ?? "",
        }
    });

    const onSubmit = async({ name }: formSchemaType) =>{
        let handler = createCity({name});
        let shouldReset = true;
        let message = "Cidade criado com Sucesso!";

        if (city?.id){
            handler = updateCity({ name, id: city.id });
            shouldReset = false;
            message = "Cidade atualizado com sucesso!";
        }

        const { error } = await handler;

        if(!error){
            if ( shouldReset) form.reset();
            toast.success(message);
            setOpen(false);
            return
        }

        toast.error(error.message);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                <Button>
                    {city ? "Atualizar" : "Criar"}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {city ? "Atualizar" : "Criar"} Cidade
                    </DialogTitle>
                    <DialogDescription>
                        {city ? "Atualize as informações da cidade" : "Crie uma nova cidade"} para utilizar nos agendamentos
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex. Itapema"{...field}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">
                                {city ? "Salvar" : "Criar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}