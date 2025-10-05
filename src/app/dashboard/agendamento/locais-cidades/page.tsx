import { getCityPlace } from "./utils/actions"
import { PaginationInput } from "@/components/ui/pagination-input";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CityPlaceDialog } from "./components/cityPlace-dialog";
import { CityPlaceDeleteDialog } from "./components/cityPlace-delete-dialog";

export default async function CityPlacePage(props: {
    searchParams?: Promise<{
        search?: string;
        page?: string;
    }>;
}) {
    const searchParams = await props.searchParams;
    const search = searchParams.search;
    const page = Number(searchParams.page || "1");
    const { data, error, pageTotal } = await getCityPlace({search, page});
    
    if (error) {
        return <p className="text-destructive">{error.message}</p>;
    }
    
    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                <h2 className="text-2xl font-bold">Locais da cidade</h2>
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-2 w-full md:w-auto">
                    <SearchInput
                        placeholder="Pesquise pelo local..."
                        className="w-full md:w-auto"
                    />
                    <CityPlaceDialog/>
                </div>
            </div>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Local</TableHead>
                            <TableHead>Cidade</TableHead>
                            <TableHead/>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((cityPlace) => (
                            <TableRow key={cityPlace.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        {cityPlace.color ? (
                                            <div
                                                className="h-4 w-4 rounded-full border"
                                                style={{ backgroundColor: cityPlace.color }}
                                            />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full border bg-transparent" />
                                        )}
                                        <span>{cityPlace.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{cityPlace.city?.name ?? 'N/A'}</TableCell>
                                <TableCell align="right" className="space-x-2">
                                    <CityPlaceDialog cityPlace={cityPlace}/>
                                    <CityPlaceDeleteDialog cityPlace={cityPlace}/>
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