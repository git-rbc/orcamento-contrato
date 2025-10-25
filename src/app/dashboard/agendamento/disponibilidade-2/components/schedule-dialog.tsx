"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CitySelect } from "@/components/city-select";
import { VendorSelect } from "@/components/vendor-select";
import { PreVendorSelect } from "@/components/pre-vendor-select";
import { CityPlaceSelect } from "@/components/city-place-select";
import { fetchAvailableSlots, createSchedule } from "../utils/schedule-actions";

const formSchema = z.object({
  externalCode: z.string().optional().nullable(),
  clientName: z.string().min(1, "Informe o nome do cliente."),
  clientPhone: z.string().min(8, "Telefone inválido."),
  preVendorId: z.string().uuid("Selecione o pré-vendedor."),
  vendorId: z.string().uuid("Selecione o vendedor."),
  cityId: z.string().uuid("Selecione a cidade."),
  placeId: z.string().uuid("Selecione o local."), 
  date: z.string().min(1, "Selecione a data."),
  availabilityId: z.string().uuid("Selecione um horário disponível."),
});

export function ScheduleDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [slots, setSlots] = useState<any[]>([]);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      externalCode: null,
      clientName: "",
      clientPhone: "",
      preVendorId: "",
      vendorId: "",
      cityId: "",
      placeId: "",
      date: "",
      availabilityId: "",
    },
  });

  const { watch, handleSubmit, register, setValue } = form;
  const vendorId = watch("vendorId");
  const cityId = watch("cityId");
  const date = watch("date");

  useEffect(() => {
    if (vendorId && cityId && date) {
      fetchAvailableSlots({ vendorId, cityId, date }).then(({ data }) => setSlots(data));
    } else {
      setSlots([]);
    }
  }, [vendorId, cityId, date]);

  async function onSubmit(values: any) {
    console.log("onSubmit disparado", values);
    
    const { error } = await createSchedule(values);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Agendamento criado com sucesso!");
    onCreated();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Cliente</Label>
              <Input {...register("clientName")} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input {...register("clientPhone")} />
            </div>
          </div>

          <PreVendorSelect
            value={form.watch("preVendorId")}
            onSelect={(v) => setValue("preVendorId", v.id)}
          />
          <VendorSelect
            value={form.watch("vendorId")}
            onSelect={(v) => setValue("vendorId", v.id)}
          />
          <CitySelect
            value={form.watch("cityId")}
            onSelect={(c) => setValue("cityId", c.id)}
          />
          <CityPlaceSelect
            value={form.watch("placeId")}
            onSelect={(p) => setValue("placeId", p.id)}
          />

          <div>
            <Label>Data</Label>
            <Input type="date" {...register("date")} />
          </div>

          {slots.length > 0 && (
            <div>
              <Label>Horário disponível</Label>
              <select
                {...register("availabilityId")}
                className="border rounded p-2 w-full"
              >
                <option value="">Selecione...</option>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.startHour} - {s.endHour}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
