"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAvailability, updateAvailability } from "../utils/actions";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Availability } from "../types/availability";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import useSWR from "swr";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

type SlotDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreateOrUpdate: () => void;
  availability: Availability;
};

export function SlotDialog({
  open,
  onClose,
  onCreateOrUpdate,
  availability,
}: SlotDialogProps) {
  const formSchema = z.object({
    startHour: z.string({ message: "Insira a hora de início"}).nonempty({ message: "Insira a hora de início"}),
    endHour: z.string({ message: "Insira a hora de fim"}).nonempty({ message: "Insira a hora de fim"}),
  });
  type formSchemaType = z.infer<typeof formSchema>;

  const form = useForm<formSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startHour: availability.startHour,
      endHour: availability.startHour,
    }
  });

  const getVendor = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("users").select("*").eq("id", id).single();
    return data;
  }

  const { data: vendor, isLoading: vendorLoading } = useSWR(
    ["vendor", availability.vendorId],
    ([_, vendorId]) => getVendor(vendorId),
  )

  const getCity = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("city").select("*").eq("id", id).single();
    return data;
  }

  const { data: city, isLoading: cityLoading } = useSWR(
    ["city", availability.cityId],
    ([_, vendorId]) => getCity(vendorId),
  )

  const onSubmit = async ({ startHour, endHour}: formSchemaType) => {
    const { id, cityId, vendorId, date } = availability;
    const { error } = id
      ? await updateAvailability({ id, cityId, vendorId, date, startHour, endHour })
      : await createAvailability({ cityId, vendorId, date, startHour, endHour });

    if (!error) {
      if (!city?.id) form.reset();
      toast.success(availability.id
        ? "Slot atualizado com sucesso!"
        : "Slot criado com sucesso!"
      );
      onClose();
      onCreateOrUpdate();
      return;
    }
    
    toast.error(error.message);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {availability.id ? "Atualizar" : "Criar"} Slot
          </DialogTitle>
          <DialogDescription>
            {availability.id ? "Atualiza as informações do slot" : "Crie um novo slot"} para agendemento
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex flex-row items-center gap-1">
            <p className="font-semibold">Vendedor:</p>
            {vendorLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"/>
            ) : (
              <p>{vendor.nome}</p>
            )}
          </div>
          <div className="flex flex-row items-center gap-1">
            <p className="font-semibold">Cidade:</p>
            {cityLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"/>
            ) : (
              <p>{city.name}</p>
            )}
          </div>
          <div className="flex flex-row items-center gap-1">
            <p className="font-semibold">Data:</p>
            <p>{new Date(availability.date).toLocaleDateString()}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex flex-row gap-4 w-full">
              <FormField
                control={form.control}
                name="startHour"
                render={({field}) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Hora Início</FormLabel>
                    <FormControl>
                      <Input type="time" placeholder="Ex. Itapema"{...field}/>
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endHour"
                render={({field}) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Hora Fim</FormLabel>
                    <FormControl>
                      <Input type="time" placeholder="Ex. Itapema"{...field}/>
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting || vendorLoading || cityLoading}>
                {availability.id ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}