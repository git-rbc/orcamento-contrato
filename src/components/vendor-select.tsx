"use client";
import { createClient } from "@/lib/supabase";
import { FC, UIEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import useSWRInfinite from "swr/infinite";
import { RefCallBack } from "react-hook-form";

type VendorSelectProps = {
  ref?: RefCallBack;
  value: string;
  onSelect: (vendor: any) => void;
}

const VendorSelect: FC<VendorSelectProps> = ({ ref, value, onSelect }) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const getVendor = async (props: {
    search: string;
    page: number;
  }) => {
    const { search, page } = props;
    const limit = 10;
    const supabase = createClient();

    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    let query = supabase.from("users").select("*", { count: "exact" }).eq("role_id", "fd142386-9d40-429f-bb25-c4f0813fe52a");
  
    if (search) query = query.ilike("nome", `%${search}%`);
  
    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(error.message);
  
    return { data, pageTotal: Math.ceil(count / limit) || 1 };
  }

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    (index) => ["vendor", debouncedSearch, index + 1],
    ([_, search, page]) => getVendor({ search, page }),
  );

  const pageTotal = useMemo(() => data?.[size - 1]?.pageTotal ?? 1, [data, size]);
  const vendors = data?.flatMap((d) => d.data) ?? [];

  const handleScroll = useCallback((ev: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = ev.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 10 && size < pageTotal && !isLoading) {
      setSize((prev) => prev + 1);
    }
  }, [pageTotal, size, isLoading]);

  useEffect(() => {
    const debounce = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <Select
      value={value}
      onValueChange={(value) => {
        const selectedVendor = vendors.find((c) => c.id === value);
        onSelect(selectedVendor);
      }}
    >
      <SelectTrigger ref={ref}>
        <SelectValue placeholder="Selecione uma cidade"/>
      </SelectTrigger>
      <SelectContent>
        <Input
          placeholder="Pesquise pelo nome..."
          className="mb-1"
          value={search}
          onChange={(ev) => setSearch(ev.currentTarget.value)}
          onKeyDown={(ev) => ev.stopPropagation()}
        />
        <div onScroll={handleScroll} className="max-h-64 overflow-y-auto">
          {!isLoading && vendors.length === 0 && (
            error ? (
              <p className="text-center text-sm text-destructive p-1">{error.message}</p>
            ) : (
              <p className="text-center text-sm text-muted-foreground p-1">Nenhum resultado encontrado</p>
            )
          )}

          {vendors.map((vendor: any) => (
            <SelectItem key={vendor.id} value={vendor.id}>{vendor.nome}</SelectItem>
          ))}

          {isLoading && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>}
        </div>
      </SelectContent>
    </Select>
  )
}

export { VendorSelect };