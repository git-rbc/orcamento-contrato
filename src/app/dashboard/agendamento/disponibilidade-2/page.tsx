"use client";
import { CitySelect } from "@/components/city-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { VendorMultiSelect } from "@/components/vendor-multi-select";
import { useState, useMemo, useEffect } from "react";
import { fetchAvailabilities } from "./utils/actions";
import { SlotDialog } from "./components/slot-dialog";
import { SlotDeleteDialog } from "./components/slot-delete-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import useSWR from "swr";
import { Availability } from "./types/availability";
import { useCopyPasteSlots } from "./utils/copy-paste-slots";
import { Plus, X } from "lucide-react";
import { colors } from "@/constants/colors";
import { ScheduleDialog } from "./components/schedule-dialog";
import { fetchSchedules } from "./utils/schedule-actions";

export default function AvailabilityPage() {
  const now = new Date();
  const threeDaysAgo = new Date(new Date(now).setDate(now.getDate() - 3));
  const sevenDaysAfter = new Date(new Date(now).setDate(now.getDate() + 7));
  const [startDate, setStartDate] = useState<Date>(threeDaysAgo);
  const [endDate, setEndDate] = useState<Date>(sevenDaysAfter);
  const [cityId, setCityId] = useState<string>();
  const [cities, setCities] = useState<{ id: string; name: string; color: string;}[]>([]);
  const [vendors, setVendors] = useState([]);
  const [dialogData, setDialogData] = useState<Availability | null>(null);
  const [deleteData, setDeleteData] = useState<{ slotId: string } | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);

  const dateDiff = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

    return Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const { data: availabilities, isLoading, mutate } = useSWR(
    ["availability", cityId, startDate, endDate],
    ([_, cityId, startDate, endDate]) => fetchAvailabilities({ cityId, startDate, endDate })
  );

  const { data: scheduleData, isLoading: isLoadingSchedules } = useSWR(
    ["schedules", cityId, startDate, endDate],
    ([_, cityId, startDate, endDate]) => fetchSchedules({ cityId, startDate, endDate })
  );

  useEffect(() => {
    if (scheduleData?.data) {
      setSchedules(scheduleData.data);
    }
  }, [scheduleData]);

  const { handleKeyDown } = useCopyPasteSlots(cityId, mutate);

  const getColor = (color?: string) => {
    let base = color;
    if (!base) base = colors[Math.floor(Math.random() * colors.length)];
    return `bg-${base}-100 text-${base}-800 border-${base}-300`;
  };

  useEffect(() => {
    if (!availabilities) return;
    const vendors = availabilities.flatMap((availability) => availability.vendor).filter((v) => !!v.id);
    setVendors((prev) => {
      const merged = [...prev, ...vendors];

      const unique = merged.filter(
        (vendor, index, self) =>
          index === self.findIndex((v) => v.id === vendor.id)
      );

      return unique;
    });
    
    const cities = availabilities
      .flatMap((availability) => availability.city)
      .filter((c) => !!c.id)
      .map((c) => ({ id: c.id, name: c.name, color: getColor(c.color) }));
    setCities(() => {
      const unique = cities.filter(
        (vendor, index, self) =>
          index === self.findIndex((v) => v.id === vendor.id)
      );

      return unique;
    });
  }, [availabilities]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        <h2 className="text-2xl font-bold">Disponibilidade</h2>
        <Button onClick={() => setOpenSchedule(true)}>+ Novo Agendamento</Button>
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
          <div className="flex flex-row items-center gap-2">
            <CitySelect value={cityId} onSelect={(city) => setCityId(city.id)} />
            {cityId && <X className="transition-all cursor-pointer hover:opacity-75" onClick={() => setCityId("")}/>}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <Label>Vendedor</Label>
          <VendorMultiSelect value={vendors} onSelect={setVendors} />
        </div>
      </div>

      <div className="flex flex-row items-center gap-2">
        {cities.map((city) => (
          <div key={city.id} className={`${city.color} border rounded-md px-2 py-0.5 text-sm`}>
            {city.name}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>
      ) : (
        <div
          className="overflow-x-auto rounded-md"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
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
              {Array.from({ length: dateDiff }).map((_, i) => {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split("T")[0];
                return (
                  <TableRow key={dateStr}>
                    <TableCell className="border text-right">{d.toLocaleDateString()}</TableCell>
                    {vendors.map((v: any) => {
                      const slots = availabilities?.filter(a => a.vendorId === v.id && a.date === dateStr).sort((a, b) => a.startHour.localeCompare(b.startHour));
                      
                      const cellId = v.id + "-" + dateStr;
                      const isSelected = selectedCell === cellId;
                      const slotsToCopy = slots.map(s => ({ startHour: s.startHour, endHour: s.endHour }));
                      
                      return (
                        <TableCell 
                          key={v.id} 
                          className={
                            "border align-center cursor-pointer relative " +
                            (isSelected ? "ring-2 ring-green-300 ring-inset" : "")
                          }
                          onClick={() => setSelectedCell(cellId)}
                          data-vendor-id={v.id}
                          data-date={dateStr}
                          data-slots={JSON.stringify(slotsToCopy)}
                          data-selected-cell={isSelected ? 'true' : 'false'}
                        >
                          <div className="flex flex-row items-center justify-center flex-wrap gap-1">
                            {slots.map((s, idx) => {
                              const color = cities.find((c) => c.id === s.cityId)?.color;
                              const hasSchedule = schedules.some(
                                (sc) => sc.availability?.startHour === s.startHour && sc.vendorId === v.id && sc.date === dateStr
                              );
                              return (
                                <div
                                  key={s.id || idx}
                                  className={
                                    "flex items-center gap-0.5 px-1 py-0.5 border rounded cursor-pointer transition-all hover:opacity-75 " +
                                    (hasSchedule ? "bg-green-100 border-green-300 " : "") +
                                    (color ?? "")
                                  }
                                  onClick={() => setDialogData(s)}
                                >
                                  <span className="font-medium text-[10px] leading-[14px]">{s.startHour}-{s.endHour}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="!p-0 size-2 text-destructive hover:bg-destructive"
                                    title="Excluir disponibilidade"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      setDeleteData({ slotId: s.id });
                                    }}
                                  >
                                    <X className="p-1"/>
                                  </Button>

                                  {schedules
                                    .filter(
                                      (sc) =>
                                        sc.availability?.startHour === s.startHour &&
                                        sc.vendorId === v.id &&
                                        sc.date === dateStr
                                    )
                                    .map((sc) => (
                                      <div
                                        key={sc.id}
                                        className="text-xs text-primary font-medium bg-primary/10 rounded px-1 mt-0.5"
                                      >
                                        {sc.clientName} ({sc.clientPhone})
                                      </div>
                                    ))}
                                </div>
                              );
                            })}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDialogData({
                                  id: "",
                                  cityId,
                                  vendorId: v.id,
                                  date: dateStr,
                                  startHour: "",
                                  endHour: "",
                                  createdAt: "",
                                  updatedAt: "",
                                });
                              }}
                              className="!size-6"
                            >
                              <Plus className="p-0.5"/>
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
            <SlotDialog
              open={!!dialogData}
              onClose={() => setDialogData(null)}
              onCreateOrUpdate={mutate}
              availability={dialogData}
            />
          )}

          {deleteData && (
            <SlotDeleteDialog
              open={!!deleteData}
              onClose={() => setDeleteData(null)}
              slotId={deleteData.slotId}
              onDeleted={mutate}
            />
          )}
        </div>
      )}
      <ScheduleDialog
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        onCreated={() => {}}
      />
    </div>
  );
}
