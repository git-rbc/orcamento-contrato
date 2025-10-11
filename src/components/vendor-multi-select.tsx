"use client";
import { createClient } from "@/lib/supabase";
import { FC, UIEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Check, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import useSWRInfinite from "swr/infinite";
import { Input } from "./ui/input";

type VendorMultiSelectProps = {
  value: any[];
  onSelect: (vendors: any[]) => void;
};

const VendorMultiSelect: FC<VendorMultiSelectProps> = ({ value, onSelect }) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const getVendor = async (props: {
    search: string;
    page: number
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
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    (index) => ["vendor", debouncedSearch, index + 1],
    ([_, search, page]) => getVendor({ search, page })
  );

  const pageTotal = useMemo(() => data?.[size - 1]?.pageTotal ?? 1, [data, size]);
  const vendors = data?.flatMap((d) => d.data) ?? [];

  const handleScroll = useCallback(
    (ev: UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = ev.currentTarget;
      if (scrollHeight - scrollTop <= clientHeight + 10 && size < pageTotal && !isLoading) {
        setSize((prev) => prev + 1);
      }
    },
    [pageTotal, size, isLoading]
  );

  useEffect(() => {
    const debounce = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const toggleVendor = (vendor: any) => {
    const alreadySelected = value.some((v) => v.id === vendor.id);
    const newSelection = alreadySelected ? value.filter((v) => v.id !== vendor.id) : [...value, vendor];
    onSelect(vendors.filter((vendor) => newSelection.some((v) => v.id === vendor.id)));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          className={cn(
            "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background",
            "data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            "[&>span]:line-clamp-1 cursor-pointer"
          )}
        >
          <span
            className={cn(
              "truncate text-left flex-1 min-w-0",
              value.length > 0 ? "" : "text-muted-foreground"
            )}
          >
            {value.length > 0
              ? value.length > 1
                ? `${value.length} Selecionados`
                : value[0]?.nome
              : "Selecione fornecedores..."}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1">
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
              <p className="text-center text-sm text-muted-foreground p-1">
                Nenhum resultado encontrado
              </p>
            )
          )}

          {vendors.map((vendor: any) => (
            <Button
              variant="ghost"
              key={vendor.id}
              value={vendor.id}
              className="relative justify-start w-full py-1.5 pl-2 pr-8 !h-auto"
              onClick={() => toggleVendor(vendor)}
            >
              {vendor.nome}
              <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                <Check
                  className={cn(
                    "h-4 w-4",
                    value.some((v) => v.id === vendor.id)
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
              </span>
            </Button>
          ))}

          {isLoading && (
            <div className="flex justify-center p-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { VendorMultiSelect };
