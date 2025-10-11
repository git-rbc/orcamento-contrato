"use client";
import { CitySelect } from "@/components/city-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { VendorMultiSelect } from "@/components/vendor-multi-select";
import { useState } from "react";

export default function AvailabilityPage() {
  const now = new Date();
  const threeDaysAgo = new Date(new Date(now).setDate(now.getDate() - 3));
  const sevenDaysAfter = new Date(new Date(now).setDate(now.getDate() + 7));
  const [startDate, setStartDate] = useState<Date>(threeDaysAgo);
  const [endDate, setEndDate] = useState<Date>(sevenDaysAfter);
  const [cityId, setCityId] = useState<string>();
  const [vendors, setVendors] = useState([]);
  
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        <h2 className="text-2xl font-bold">Disponibilidade</h2>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-2 w-full md:w-auto">

        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <Label>Início</Label>
          <DatePicker date={startDate} setDate={setStartDate}/>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <Label>Fim</Label>
          <DatePicker date={endDate} setDate={setEndDate} min={startDate}/>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <Label>Cidade</Label>
          <CitySelect value={cityId} onSelect={(city) => setCityId(city.id)}/>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <Label>Vendedor</Label>
          <VendorMultiSelect value={vendors} onSelect={setVendors}/>
        </div>
      </div>
      {cityId ? (
        <></>
      ) : (
        <p className="text-sm font-medium">Selecione uma cidade para continuar</p>
      )}
    </div>
  )
}