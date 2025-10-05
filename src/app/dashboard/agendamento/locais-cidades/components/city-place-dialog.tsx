"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CityPlace } from "../types/cityPlace";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createCityPlace, updateCityPlace } from "../utils/actions";
import { useState } from "react";
import { toast } from "sonner";
import { CitySelect } from "@/components/city-select";
import { ColorPicker } from "./color-picker";

export function CityPlaceDialog({
    cityPlace
} : {
    cityPlace?: CityPlace;
}) {
    const [open, setOpen] = useState(false);

    const formSchema = z.object({
        name: z.string({ message: "Insira um local"}).nonempty({ message: "Insira um local"}),
        cityId: z.string({ message: "Selecione uma cidade"}).nonempty({ message: "Selecione uma cidade"}),
        color: z.string().optional(),
    });
    type formSchemaType = z.infer<typeof formSchema>;

    const form = useForm<formSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: cityPlace?.name ?? "",
            cityId: cityPlace?.cityId ?? "",
            color: cityPlace?.color ?? "",

        }
    });

    const onSubmit = async ({ name, cityId, color }: formSchemaType) => {
        let handler = createCityPlace({ name, cityId, color });
        let shouldReset = true;
        let message = "Local criado com sucesso!";

        if (cityPlace?.id) {
            handler = updateCityPlace({ name, id: cityPlace.id, cityId, color });
            shouldReset = false;
            message = "Local atualizado com sucesso!";
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
                    {cityPlace ? "Atualizar" : "Criar"}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
            {cityPlace ? "Atualizar" : "Criar"} Local
                    </DialogTitle>
                    <DialogDescription>
                        {cityPlace ? "Atualize as informações do Local" : "Crie um novo Local"} para utilizar nos agendamentos
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Local</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex. Morretes" {...field}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cityId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cidade</FormLabel>
                                    <FormControl>
                                        <CitySelect
                                            ref={field.ref}
                                            value={field.value}
                                            onSelect={(city) => {
                                                field.onChange(city?.id ?? "");
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cor (Opcional)</FormLabel>
                                    <FormControl>
                                        <ColorPicker 
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">
                                {cityPlace ? "Salvar" : "Criar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}