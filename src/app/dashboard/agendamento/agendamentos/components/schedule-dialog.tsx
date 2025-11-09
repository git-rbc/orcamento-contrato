"use client";
import { z } from "zod";
import { Schedule } from "../types/schedule";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { CitySelect } from "@/components/city-select";
import { PreVendorSelect } from "@/components/pre-vendor-select";
import { VendorSelect } from "@/components/vendor-select";
import { CityPlaceSelect } from "@/components/city-place-select";
import { DatePicker } from "@/components/ui/date-picker";
import { createSchedule, updateSchedule } from "../utils/actions";
import { SlotSelect } from "@/components/slot-select";

export function ScheduleDialog({
  schedule,
  customLabel,
  onSuccess,
  defaultOpen,
  onClose,
} : {
  schedule?: Partial<Schedule>;
  customLabel?: string;
  onSuccess?: () => void;
  defaultOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  const formSchema = z.object({
    externalCode: z.string().optional(),
    clientName: z.string({ message: "Informe o nome do cliente" }).nonempty("Informe o nome do cliente"),
    clientPhone: z.string({ message: "Informe o telefone do cliente" }).nonempty("Informe o telefone do cliente"),
    preVendorId: z.string({ message: "Selecione o pré-vendedor" }).uuid("Selecione o pré-vendedor"),
    vendorId: z.string({ message: "Selecione o vendedor" }).uuid("Selecione o vendedor"),
    cityId: z.string({ message: "Selecione a cidade" }).uuid("Selecione a cidade"),
    cityPlaceId: z.string({ message: "Selecione o local" }).uuid("Selecione o local"), 
    date: z.date({ message: "Selecione uma data" }),
    availabilityId: z.string({ message: "Selecione um slot" }).uuid("Selecione um slot"),
  });
  type formSchemaType = z.infer<typeof formSchema>;
  
  const form = useForm<formSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      externalCode: schedule?.externalCode ?? "",
      clientName: schedule?.clientName ?? "",
      clientPhone: schedule?.clientPhone ?? "",
      preVendorId: schedule?.preVendorId ?? "",
      vendorId: schedule?.vendorId ?? "",
      cityId: schedule?.cityId ?? "",
      cityPlaceId: schedule?.cityPlaceId ?? "",
      date: schedule?.date ? new Date(schedule.date) : undefined,
      availabilityId: schedule?.availabilityId ?? "",
    },
  });
  const vendorId = form.watch("vendorId");
  const cityId = form.watch("cityId");
  const date = form.watch("date");

  const onSubmit = async({
    externalCode,
    clientName, 
    clientPhone,
    preVendorId,
    vendorId,
    cityId,
    cityPlaceId,
    date,
    availabilityId,
  }: formSchemaType) =>{
    const { error } = schedule?.id
      ? await updateSchedule({ id: schedule.id, externalCode, clientName, clientPhone, preVendorId, vendorId, cityId, cityPlaceId, date, availabilityId })
      : await createSchedule({ externalCode, clientName, clientPhone, preVendorId, vendorId, cityId, cityPlaceId, date, availabilityId });

    if (!error) {
      if (!schedule?.id) form.reset();
      toast.success(schedule?.id
        ? "Agendamento atualizado com sucesso!"
        : "Agendamento criado com sucesso!"
      );
      setOpen(false);
      onClose?.();
      onSuccess?.();
      return;
    }
    
    toast.error(error.message);
  }

  useEffect(() => {
    let availabilityId = "";
    const parsedDate = date?.toISOString().split("T")[0];
    if (
      schedule?.vendorId === vendorId &&
      schedule?.cityId === cityId &&
      schedule?.date === parsedDate &&
      schedule?.availabilityId
    ) {
      availabilityId =schedule.availabilityId;
    }
    form.setValue("availabilityId", availabilityId);
  }, [schedule, vendorId, cityId, date]);

  useEffect(() => {
    let cityPlaceId = "";
    if (
      schedule?.cityId === cityId &&
      schedule?.cityPlaceId
    ) {
      cityPlaceId = schedule.cityPlaceId;
    }
    form.setValue("cityPlaceId", cityPlaceId);
  }, [schedule, cityId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        onClose?.();
      }}
    >
      <DialogTrigger asChild>
        {!defaultOpen ? (
          <Button>
            {customLabel ? customLabel : schedule ? "Atualizar" : "Criar"}
          </Button>
        ) : null}
      </DialogTrigger>
      <DialogContent className="max-h-[85%] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {schedule ? "Atualizar" : "Criar"} Agendamento
          </DialogTitle>
          <DialogDescription>
            {schedule ? "Atualize as informações do" : "Crie um novo"} agendamento
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="externalCode"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Código Externo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. ON1234" {...field}/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientName"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Nome do Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. João" {...field}/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientPhone"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Telefone do Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. +5547999999999" {...field}/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preVendorId"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Pré-vendedor</FormLabel>
                  <FormControl>
                    <PreVendorSelect value={field.value} onSelect={(preVendor) => field.onChange(preVendor.id)} field={field}/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vendorId"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Vendedor</FormLabel>
                  <FormControl>
                    <VendorSelect value={field.value} onSelect={(vendor) => field.onChange(vendor.id)} field={field}/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cityId"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <CitySelect value={field.value} onSelect={(city) => field.onChange(city.id)} field={field}/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cityPlaceId"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <FormControl>
                    <CityPlaceSelect cityId={cityId} value={field.value} onSelect={(cityPlace) => field.onChange(cityPlace.id)} field={field} dynamic/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <DatePicker date={field.value} setDate={(date) => field.onChange(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())))} />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="availabilityId"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Horário</FormLabel>
                  <FormControl>
                    <SlotSelect 
                      vendorId={vendorId}
                      cityId={cityId}
                      date={date}
                      value={field.value} 
                      onSelect={(availability) => field.onChange(availability.id)}
                      field={field}
                      dynamic
                    />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {schedule ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}