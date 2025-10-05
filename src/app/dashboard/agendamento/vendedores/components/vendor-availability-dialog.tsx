"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Check } from "lucide-react";
import { Vendor } from "../types/vendor";
import { DatePicker } from "@/components/ui/date-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { CitySelect } from "@/components/city-select";
import useSWR from "swr";
import { getVendorAvailability, upsertVendorAvailability } from "../utils/actions";
import { toast } from "sonner";

type AvailabilitySelector = {
  [cityId: string]: {
    [date: string]: string[];
  }
}

export function VendorAvailabilityDialog({
  vendor,
} : {
  vendor: Vendor;
}) {
  const now = new Date();
  const threeDaysAgo = new Date(new Date(now).setDate(now.getDate() - 3));
  const sevenDaysAfter = new Date(new Date(now).setDate(now.getDate() + 7));
  const [startDate, setStartDate] = useState<Date>(threeDaysAgo);
  const [endDate, setEndDate] = useState<Date>(sevenDaysAfter);
  const [cityId, setCityId] = useState<string>();
  const [availability, setAvailability] = useState<AvailabilitySelector>({});

  const { data, isLoading } = useSWR(
    ["vendor-availability", vendor.id, startDate, endDate],
    ([_, vendorId, startDate, endDate]) => getVendorAvailability({ vendorId, startDate, endDate }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshInterval: 0,
    }
  )

  const dateList = useMemo(() => {
    if (!startDate && !endDate) return [];
    if (!startDate && endDate) return [endDate];
    if (startDate && !endDate) return [startDate];

    const dates: Date[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }, [startDate, endDate]);

  const handleSlotSelect = useCallback((date: Date, slot: string) => {
    if (!cityId) return;
    const dateKey = date.toISOString().split("T")[0];

    setAvailability((prev) => {
      const cityAvailability = prev[cityId] || {};
      let dayAvailability = cityAvailability[dateKey] || [];

      const slotIsSelected = dayAvailability.some((s) => s === slot);
      if (slotIsSelected) dayAvailability = dayAvailability.filter((s) => s !== slot);
      else dayAvailability.push(slot);

      return {
        ...prev,
        [cityId]: {
          ...cityAvailability,
          [dateKey]: dayAvailability,
        }
      }
    });
  }, [cityId]);

  const handleSaveAvailability = useCallback(async () => {
    const vendorId = vendor.id;
    const availabilities = data?.data;
    const newAvailabilities = [];

    Object.entries(availability).forEach(([cityId, value]) => {
      Object.entries(value).forEach(([date, slots]) => {
        let availability = availabilities.find((a) => a.cityId === cityId && a.date === date);
        if (!availability) {
          availability = {
            vendorId,
            cityId,
            date,
          };
        }
        availability.slots = slots;
        newAvailabilities.push(availability);
      });
    });

    const { error } = await upsertVendorAvailability(newAvailabilities);

    if (!error) {
      toast.success("Disponibilidade salva com sucesso!");
      return;
    }

    toast.error(error.message);
  }, [vendor, availability, data?.data]);

  useEffect(() => {
    const availabilities = data?.data;
    if (!availabilities) return;
    const savedAvailability: AvailabilitySelector = {};
    availabilities.forEach((availability) => {
      const cityId = availability.cityId;
      const dateKey = availability.date;
      if (!savedAvailability[cityId]) savedAvailability[cityId] = {};
      savedAvailability[cityId][dateKey] = availability.slots;
    });
    setAvailability(savedAvailability);
  }, [data?.data]);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon">
          <Calendar/>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex flex-col max-h-[85dvh]">
        <DialogHeader>
          <DialogTitle>Disponibilidade do Vendedor</DialogTitle>
          <DialogDescription>Configure a disponibilidade do Vendedor em cada Cidade</DialogDescription>
        </DialogHeader>
        <div className="flex flex-row items-center gap-2">
          <div className="flex flex-col gap-2 w-full">
            <Label>Início</Label>
            <DatePicker date={startDate} setDate={setStartDate}/>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Label>Fim</Label>
            <DatePicker date={endDate} setDate={setEndDate} min={startDate}/>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <Label>Cidade</Label>
          <CitySelect value={cityId} onSelect={(city) => setCityId(city.id)}/>
        </div>
        {isLoading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>
        ) : cityId ? (
          <div className="flex-grow overflow-y-auto">
            <div className="flex flex-row gap-2">
              <div className="flex flex-col gap-2 mt-7">
                {dateList.map((date, index) => (
                  <p
                    key={index}
                    className={`text-sm ${date.getDate() === now.getDate() ? "font-semibold" : ""}`}
                  >
                    {date.toLocaleDateString()}
                  </p>
                ))}
              </div>
              <div className="flex flex-row gap-1 overflow-x-auto">
                {Array.from({ length: 24 }).map((_, index) => {
                  const slot = String(index).padStart(2, "0");
                  return (
                    <div key={index} className="flex flex-col items-center gap-2 w-7">
                      <p className="text-sm">{slot}h</p>
                      {Array.from({ length: dateList.length }).map((_, index) => {
                        const date = dateList[index];
                        const dateKey = date.toISOString().split("T")[0];
                        const dayAvailability = availability[cityId]?.[dateKey];
              
                        const isSelectedInOtherCity = Object.entries(availability).reduce((acc, [key, slots]) => {
                          if (acc) return acc;
                          if (cityId === key) return acc;
                          const dayAvailability = slots[dateKey];
                          return dayAvailability?.some((s) => s === slot);
                        }, false);

                        const isSelected = dayAvailability?.some((s) => s === slot) || isSelectedInOtherCity;
                        return (
                          <Button
                            key={index}
                            variant={isSelected ? "default" : "outline"}
                            size="icon"
                            className="size-5"
                            onClick={() => handleSlotSelect(date, slot)}
                            disabled={isSelectedInOtherCity}
                          >
                            {isSelected ? <Check/> : null}
                          </Button>
                        )
                      })}
                    </div> 
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium">Selecione uma cidade para continuar.</p>
        )}
        <DialogFooter>
          <Button onClick={handleSaveAvailability}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}