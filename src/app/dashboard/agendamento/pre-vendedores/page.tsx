import { getPreVendor } from "./utils/actions"
import { PaginationInput } from "@/components/ui/pagination-input";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PreVendorDialog } from "./components/pre-vendor-dialog"; 
import { PreVendorDeleteDialog } from "./components/pre-vendor-delete-dialog";

export default async function PreVendorPage(props: {
    searchParams?: Promise<{
        search?: string;
        page?: string;
    }>;
}) {
    const searchParams = await props.searchParams;
    const search = searchParams.search;
    const page = Number (searchParams.page || "1");
    const { data, error, pageTotal } = await getPreVendor({search, page});

    if(error){
        return <p className="textdestructive">{error.message}</p>;
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                <h2 className="text-2xl font-bold">Pré-vendedores</h2>
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-2 w-full md:w-auto">
                    <SearchInput
                        placeholder="Pesquise pelo nome..."
                        className="w-full md:w-auto"
                    />
                    <PreVendorDialog/>
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
                        {data.map((preVendor) => (
                            <TableRow key={preVendor.id}>
                                <TableCell>{preVendor.name}</TableCell>
                                <TableCell align="right" className="space-x-2">
                                    <PreVendorDialog preVendor={preVendor}/>
                                    <PreVendorDeleteDialog preVendor={preVendor}/>
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