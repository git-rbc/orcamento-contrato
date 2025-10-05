import { getVendor } from "./utils/actions"
import { PaginationInput } from "@/components/ui/pagination-input";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VendorDialog } from "./components/vendor-dialog";
import { VendorDeleteDialog } from "./components/vendor-delete-dialog";
import { VendorAvailabilityDialog } from "./components/vendor-availability-dialog";

export default async function VendorPage(props: {
  searchParams?: Promise<{
    search?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const search = searchParams.search;
  const page = Number(searchParams.page || "1");
  const { data, error, pageTotal } = await getVendor({search, page});
  
  if (error) {
    return <p className="text-destructive">{error.message}</p>;
  }
  
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        <h2 className="text-2xl font-bold">Vendedores</h2>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-2 w-full md:w-auto">
          <SearchInput
            placeholder="Pesquise pelo nome..."
            className="w-full md:w-auto"
          />
          <VendorDialog/>
        </div>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead/>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>{vendor.name}</TableCell>
                <TableCell align="right">
                  <div className="inline-flex space-x-2">
                    <VendorAvailabilityDialog vendor={vendor}/>
                    <VendorDialog vendor={vendor}/>
                    <VendorDeleteDialog vendor={vendor}/>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div>
        <PaginationInput page={page} pageTotal={pageTotal}/>
      </div>
    </div> 
  )
}