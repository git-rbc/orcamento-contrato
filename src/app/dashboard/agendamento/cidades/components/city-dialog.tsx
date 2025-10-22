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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { colors } from "@/constants/colors";

export function CityDialog({
    city
} : {
    city?: City;
}){
    const [open, setOpen] = useState(false);

    const formSchema = z.object({
        name: z.string({ message: "Insira uma cidade"}).nonempty({ message: "Insira uma cidade"}),
        color: z.string({ message: "Selecione uma cor"}).nonempty({ message: "Selecione uma cor"})
    });
    type formSchemaType = z.infer<typeof formSchema>;

    const form = useForm<formSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name:city?.name ?? "",
            color: city?.color ?? "",
        }
    });

    const onSubmit = async({ name, color }: formSchemaType) =>{
        const { error } = city?.id
            ? await updateCity({ color, name, id: city.id })
            : await createCity({ color, name });
    
        if (!error) {
            if (!city?.id) form.reset();
            toast.success(city?.id
            ? "Cidade atualizado com sucesso!"
            : "Cidade criado com sucesso!"
            );
            setOpen(false);
            return;
        }
        
        toast.error(error.message);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
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
                        <FormField
                            control={form.control}
                            name="color"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={(value) => field.onChange(value)} {...field}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione uma cor"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {colors.map((color) => (
                                                    <SelectItem key={color} value={color}>
                                                        <div className="flex flex-row items-center gap-2">
                                                            <span className={`bg-${color}-100 text-${color}-800 border-${color}-300 size-4 border rounded-full`}/>
                                                            <p>{color}</p>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {city ? "Salvar" : "Criar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}