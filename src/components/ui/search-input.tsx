"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "./input";
import { Search } from "lucide-react";
import { useDebouncedCallback } from 'use-debounce';

export function SearchInput({
  placeholder = "",
  className = "",
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const handleSearch = useDebouncedCallback((search: string) => {
    const params = new URLSearchParams(searchParams);
    if (search) params.set("search", search);
    else params.delete("search");
    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        className={`${className} pr-9`}
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('search')?.toString()}
      />
      <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
    </div>
  )
}