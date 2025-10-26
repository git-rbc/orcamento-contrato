import { getSchedule } from "./utils/actions"
import { PaginationInput } from "@/components/ui/pagination-input"
import { SearchInput } from "@/components/ui/search-input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScheduleDialog } from "./components/schedule-dialog";
import { ScheduleDeleteDialog } from "./components/schedule-delete-dialog";

export default async function SchedulePage(props: {
    searchParams?: Promise<{
        search?: string;
        page?: string;
    }>;
}) {
    const searchParams = await props.searchParams;
    const search = searchParams.search;
    const page = Number(searchParams.page || "1");
    const { data, error, pageTotal } = await getSchedule({search, page});

    const formatDate = (date: string) => {
      const parts = date.split("-");
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }

    if (error) {
        return <p className="text-destructive">{error.message}</p>;
    }

    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          <h2 className="text-2xl font-bold">Agendamentos</h2>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-2 w-full md:w-auto">
            <SearchInput
            placeholder="Pesquise pela agendamento"
            className="w-full md:w-auto"
            />
            <ScheduleDialog/>
          </div>
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Pré-vendedor</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Data</TableHead>
                <TableHead/>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>{schedule.externalCode ?? "-"}</TableCell>
                  <TableCell>{schedule.clientName}</TableCell>
                  <TableCell>{schedule.clientPhone}</TableCell>
                  <TableCell>{schedule.preVendor?.nome ?? "-"}</TableCell>
                  <TableCell>{schedule.vendor?.nome ?? "-"}</TableCell>
                  <TableCell>{schedule.city?.name ?? "-"}</TableCell>
                  <TableCell>{schedule.cityPlace?.nome ?? "-"}</TableCell>
                  <TableCell>{formatDate(schedule.date)}</TableCell>
                  <TableCell align="right" className="space-x-2">
                    <ScheduleDialog schedule={schedule}/>
                    <ScheduleDeleteDialog schedule={schedule}/>
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