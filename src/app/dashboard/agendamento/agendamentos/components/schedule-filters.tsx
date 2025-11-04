"use client";
import { CityPlaceSelect } from "@/components/city-place-select";
import { CitySelect } from "@/components/city-select";
import { PreVendorSelect } from "@/components/pre-vendor-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { VendorSelect } from "@/components/vendor-select";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";


export function ScheduleFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  const preVendorId = searchParams.get('preVendorId')?.toString() ?? "";
  const vendorId = searchParams.get('vendorId')?.toString() ?? "";
  const cityId = searchParams.get('cityId')?.toString() ?? "";
  const cityPlaceId = searchParams.get('cityPlaceId')?.toString() ?? "";
  const startDate = searchParams.get('startDate')?.toString() ?? "";
  const endDate = searchParams.get('endDate')?.toString() ?? "";

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <Label>Pré-vendedor</Label>
          <div className="flex flex-row items-center gap-2">
            <PreVendorSelect
              value={preVendorId}
              onSelect={(preVendor) => handleFilter("preVendorId", preVendor.id)}
            />
            {preVendorId && <X className="transition-all cursor-pointer hover:opacity-75" onClick={() => handleFilter("preVendorId", "")}/>}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <Label>Vendedor</Label>
          <div className="flex flex-row items-center gap-2">
            <VendorSelect
              value={vendorId}
              onSelect={(vendor) => handleFilter("vendorId", vendor.id)}
            />
            {vendorId && <X className="transition-all cursor-pointer hover:opacity-75" onClick={() => handleFilter("vendorId", "")}/>}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <Label>Cidade</Label>
          <div className="flex flex-row items-center gap-2">
            <CitySelect
              value={cityId}
              onSelect={(city) => handleFilter("cityId", city.id)}
            />
            {cityId && <X className="transition-all cursor-pointer hover:opacity-75" onClick={() => handleFilter("cityId", "")}/>}
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <Label>Local</Label>
          <div className="flex flex-row items-center gap-2">
            <CityPlaceSelect
              value={cityPlaceId}
              onSelect={(cityPlace) => handleFilter("cityPlaceId", cityPlace.id)}
            />
            {cityPlaceId && <X className="transition-all cursor-pointer hover:opacity-75" onClick={() => handleFilter("cityPlaceId", "")}/>}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <Label>Início</Label>
          <div className="flex flex-row items-center gap-2">
            <DatePicker
              date={startDate ? new Date(startDate) : undefined}
              setDate={(date) => handleFilter("startDate", `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`)}
              max={endDate ? new Date(endDate) : undefined}
            />
            {startDate && <X className="transition-all cursor-pointer hover:opacity-75" onClick={() => handleFilter("startDate", "")}/>}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <Label>Fim</Label>
          <div className="flex flex-row items-center gap-2">
            <DatePicker
              date={endDate ? new Date(endDate) : undefined}
              setDate={(date) => handleFilter("endDate", `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`)}
              min={startDate ? new Date(startDate) : undefined}
            />
            {endDate && <X className="transition-all cursor-pointer hover:opacity-75" onClick={() => handleFilter("endDate", "")}/>}
          </div>
        </div>
      </div>
    </>
  )
}