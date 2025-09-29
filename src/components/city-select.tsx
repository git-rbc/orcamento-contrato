"use client";
import { createClient } from "@/lib/supabase";
import { UIEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import useSWRInfinite from "swr/infinite";

const CitySelect = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const getCity = async (props: {
    search: string;
    page: number;
  }) => {
    const { search, page } = props;
    const limit = 10;
    const supabase = createClient();

    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    let query = supabase.from("city").select("*", { count: "exact" });
  
    if (search) query = query.ilike("name", `%${search}%`);
  
    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(error.message);
  
    return { data, pageTotal: Math.ceil(count / limit) || 1 };
  }

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    (index) => ["city", debouncedSearch, index + 1],
    ([_, search, page]) => getCity({ search, page }),
  );

  const pageTotal = useMemo(() => {
    return data?.[size - 1]?.pageTotal ?? 1;
  }, [data, size]);

  const cities = data?.flatMap((d) => d.data) ?? [];

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
    <Select>
      <SelectTrigger>
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
          {!isLoading && cities.length === 0 && (
            error ? (
              <p className="text-center text-sm text-destructive p-1">{error.message}</p>
            ) : (
              <p className="text-center text-sm text-muted-foreground p-1">Nenhum resultado encontrado</p>
            )
          )}

          {cities.map((city: any) => (
            <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
          ))}

          {isLoading && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>}
        </div>
      </SelectContent>
    </Select>
  )
}

export { CitySelect };