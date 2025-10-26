"use client";
import { createClient } from "@/lib/supabase";
import { FC, UIEvent, useCallback, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import useSWRInfinite from "swr/infinite";
import { ControllerRenderProps, RefCallBack } from "react-hook-form";

type SlotSelectProps = {
  vendorId?: string;
  cityId?: string;
  date?: Date;
  ref?: RefCallBack;
  value: string;
  onSelect: (availability: any) => void;
  field?: ControllerRenderProps;
  dynamic?: boolean;
}

const SlotSelect: FC<SlotSelectProps> = ({ vendorId, cityId, date, ref, value, onSelect, field, dynamic }) => {
  const getAvailability = async (props: {
    vendorId?: string;
    cityId?: string;
    date?: Date;
    dynamic?: boolean;
    page: number;
  }) => {
    const { vendorId, cityId, date, dynamic, page } = props;
    if (dynamic && (!vendorId || !cityId || !date)) return { data: [], pageTotal: 1 };

    const limit = 10;
    const supabase = createClient();

    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    let query = supabase.from("availability").select("*, schedule(availabilityId)", { count: "exact" });
    
    if (vendorId) query.eq("vendorId", vendorId);
    if (cityId) query.eq("cityId", cityId);
    if (date) query.eq("date", date.toISOString());
  
    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(error.message);
  
    return { data: data.filter((a) => a.schedule.length === 0), pageTotal: Math.ceil(count / limit) || 1 };
  }

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    (index) => ["availability", vendorId, cityId, date, dynamic, index + 1],
    ([_, vendorId, cityId, date, dynamic, page]) => getAvailability({ vendorId, cityId, date, dynamic, page }),
  );

  const pageTotal = useMemo(() => {
    return data?.[size - 1]?.pageTotal ?? 1;
  }, [data, size]);

  const availabilities = data?.flatMap((d) => d.data) ?? [];

  const handleScroll = useCallback((ev: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = ev.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 10 && size < pageTotal && !isLoading) {
      setSize((prev) => prev + 1);
    }
  }, [pageTotal, size, isLoading]);

  return (
    <Select
      {...field}
      value={value}
      onValueChange={(value) => {
        const selectedAvailability = availabilities.find((c) => c.id === value);
        onSelect(selectedAvailability);
      }}
    >
      <SelectTrigger ref={ref}>
        <SelectValue placeholder="Selecione uma slot"/>
      </SelectTrigger>
      <SelectContent>
        <div onScroll={handleScroll} className="max-h-64 overflow-y-auto">
          {!isLoading && availabilities.length === 0 && (
            error ? (
              <p className="text-center text-sm text-destructive p-1">{error.message}</p>
            ) : (
              <p className="text-center text-sm text-muted-foreground p-1">Nenhum resultado encontrado</p>
            )
          )}

          {availabilities.map((availability: any) => (
            <SelectItem key={availability.id} value={availability.id}>{availability.startHour} - {availability.endHour}</SelectItem>
          ))}

          {isLoading && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>}
        </div>
      </SelectContent>
    </Select>
  )
}

export { SlotSelect };