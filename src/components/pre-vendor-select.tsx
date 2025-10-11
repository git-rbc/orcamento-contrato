"use client";
import { createClient } from "@/lib/supabase";
import { FC, UIEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import useSWRInfinite from "swr/infinite";
import { RefCallBack } from "react-hook-form";

type PreVendorSelectProps = {
  ref?: RefCallBack;
  value: string;
  onSelect: (preVendor: any) => void;
}

const PreVendorSelect: FC<PreVendorSelectProps> = ({ ref, value, onSelect }) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const getPreVendor = async (props: {
    search: string;
    page: number;
  }) => {
    const { search, page } = props;
    const limit = 10;
    const supabase = createClient();

    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    let query = supabase.from("users").select("*", { count: "exact" }).eq("role_id", "581743e4-6726-4ff4-803d-e1ae36491434");
  
    if (search) query = query.ilike("nome", `%${search}%`);
  
    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(error.message);
  
    return { data, pageTotal: Math.ceil(count / limit) || 1 };
  }

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    (index) => ["pre-vendor", debouncedSearch, index + 1],
    ([_, search, page]) => getPreVendor({ search, page }),
  );

  const pageTotal = useMemo(() => data?.[size - 1]?.pageTotal ?? 1, [data, size]);
  const preVendors = data?.flatMap((d) => d.data) ?? [];

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
        const selectedPreVendor = preVendors.find((c) => c.id === value);
        onSelect(selectedPreVendor);
      }}
    >
      <SelectTrigger ref={ref}>
        <SelectValue placeholder="Selecione um pré-vendedor"/>
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
          {!isLoading && preVendors.length === 0 && (
            error ? (
              <p className="text-center text-sm text-destructive p-1">{error.message}</p>
            ) : (
              <p className="text-center text-sm text-muted-foreground p-1">Nenhum resultado encontrado</p>
            )
          )}

          {preVendors.map((preVendor: any) => (
            <SelectItem key={preVendor.id} value={preVendor.id}>{preVendor.nome}</SelectItem>
          ))}

          {isLoading && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>}
        </div>
      </SelectContent>
    </Select>
  )
}

export { PreVendorSelect };