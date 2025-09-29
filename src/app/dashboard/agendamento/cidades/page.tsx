import { getCity } from "./utils/actions"
import { PaginationInput } from "@/components/ui/pagination-input"
import { SearchInput } from "@/components/ui/search-input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CityDialog } from "./components/city-dialog";
import { CityDeleteDialog } from "./components/city-delete-dialog";

export default async function CityPage(props: {
    searchParams?: Promise<{
        search?: string;
        page?: string;
    }>;
}) {
    const searchParams = await props.searchParams;
    const search = searchParams.search;
    const page = Number(searchParams.page || "1");
    const { data, error, pageTotal } = await getCity({search, page});

    if (error) {
        return <p className="text-destructive">{error.message}</p>;
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                <h2 className="text-2xl font-bold">Cidades</h2>
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-2 w-full md:w-auto">
                    <SearchInput
                    placeholder="Pesquise pela cidade"
                    className="w-full md:w-auto"
                    />
                    <CityDialog/>
                </div>
            </div>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cidades</TableHead>
                            <TableHead/>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((city) => (
                            <TableRow key={city.id}>
                                <TableCell>{city.name}</TableCell>
                                <TableCell align="right" className="space-x-2">
                                    <CityDialog city={city}/>
                                    <CityDeleteDialog city={city}/>
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