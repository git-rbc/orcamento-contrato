"use client";
import { CitySelect } from "@/components/city-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { VendorMultiSelect } from "@/components/vendor-multi-select";
import { useState, useMemo } from "react";
import { fetchAvailabilities } from "./utils/actions";
import { AddSlotDialog } from "./components/add-slot-dialog";
import { DeleteSlotDialog } from "./components/delete-slot-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import useSWR from "swr";

export default function AvailabilityPage() {
  const now = new Date();
  const threeDaysAgo = new Date(new Date(now).setDate(now.getDate() - 3));
  const sevenDaysAfter = new Date(new Date(now).setDate(now.getDate() + 7));
  const [startDate, setStartDate] = useState<Date>(threeDaysAgo);
  const [endDate, setEndDate] = useState<Date>(sevenDaysAfter);
  const [cityId, setCityId] = useState<string>();
  const [vendors, setVendors] = useState([]);
  const [dialogData, setDialogData] = useState<{ vendorId: string; date: string } | null>(null);
  const [deleteData, setDeleteData] = useState<{ slotId: string } | null>(null);

  const vendorIds = useMemo(() => {
    return vendors.map((v) => v.id);
  }, [vendors]);

  const { data: availabilities, isLoading, mutate } = useSWR(
    ["availability", cityId, vendorIds, startDate, endDate],
    ([_, cityId, vendorIds, startDate, endDate]) => fetchAvailabilities({ cityId, vendorIds, startDate, endDate })
  )

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        <h2 className="text-2xl font-bold">Disponibilidade</h2>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <Label>Início</Label>
          <DatePicker date={startDate} setDate={setStartDate} />
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <Label>Fim</Label>
          <DatePicker date={endDate} setDate={setEndDate} min={startDate} />
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <Label>Cidade</Label>
          <CitySelect value={cityId} onSelect={(city) => setCityId(city.id)} />
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <Label>Vendedor</Label>
          <VendorMultiSelect value={vendors} onSelect={setVendors} />
        </div>
      </div>

      {isLoading ? (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>
      ) : cityId && vendors.length > 0 ? (
        <div className="overflow-x-auto rounded-md">
          <Table className="w-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="border w-28 min-w-28 text-right">Data</TableHead>
                {vendors.map((v: any) => (
                  <TableHead key={v.id} className="border w-96 min-w-96 text-center">
                    {v.nome || "Sem nome"}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1 }).map((_, i) => {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split("T")[0];
                return (
                  <TableRow key={dateStr}>
                    <TableCell className="border text-right">{d.toLocaleDateString()}</TableCell>
                    {vendors.map((v: any) => {
                      const slots = availabilities?.filter(a => a.vendorId === v.id && a.date === dateStr);
                      return (
                        <TableCell key={v.id} className="border align-center">
                          <div className="flex flex-row items-center justify-center flex-wrap gap-1">
                            {slots.map((s, idx) => {
                              const now = new Date();
                              const slotStart = new Date(`${s.date}T${s.startHour}`);
                              const slotEnd = new Date(`${s.date}T${s.endHour}`);

                              let colorClass = "bg-green-100 text-green-800 border-green-300";
                              if (now >= slotStart && now <= slotEnd) {
                                colorClass = "bg-yellow-100 text-yellow-800 border-yellow-300";
                              } else if (now > slotEnd) {
                                colorClass = "bg-red-100 text-red-800 border-red-300";
                              }

                              return (
                                <div
                                  key={s.id || idx}
                                  className={`flex items-center gap-1 px-2 py-1 border rounded ${colorClass}`}
                                >
                                  <span className="font-medium">{s.startHour} - {s.endHour}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="!p-0 size-5 text-destructive hover:bg-destructive"
                                    title="Excluir disponibilidade"
                                    onClick={() => setDeleteData({ slotId: s.id })}
                                  >
                                    ×
                                  </Button>
                                </div>
                              );
                            })}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDialogData({ vendorId: v.id, date: dateStr })}
                              className="w-8 h-8"
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {dialogData && (
            <AddSlotDialog
              open={!!dialogData}
              onClose={() => setDialogData(null)}
              vendorId={dialogData.vendorId}
              cityId={cityId}
              date={dialogData.date}
              onCreated={mutate}
            />
          )}

          {deleteData && (
            <DeleteSlotDialog
              open={!!deleteData}
              onClose={() => setDeleteData(null)}
              slotId={deleteData.slotId}
              onDeleted={mutate}
            />
          )}
        </div>
      ) : (
        <p className="text-sm font-medium">Selecione uma cidade e/ou um vendedor para continuar</p>
      )}
    </div>
  );
}
