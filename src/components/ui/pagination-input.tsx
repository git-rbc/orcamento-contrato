"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./pagination";

export function PaginationInput({
  page = 1,
  pageTotal = 1
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const parsedHref = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    return `${pathname}?${params.toString()}`
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href={parsedHref(page > 1 ? page - 1 : 1)} />
        </PaginationItem>
        {Array.from({ length: pageTotal }).map((_, i) => (
          <PaginationItem>
            <PaginationLink href={parsedHref(i + 1)} isActive={page === i + 1}>
              {i + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href={parsedHref(page < pageTotal ? page + 1 : pageTotal)} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}