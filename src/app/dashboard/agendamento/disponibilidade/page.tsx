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
import { Plus, Trash, X } from "lucide-react";
import { colors } from "@/constants/colors";
import { ScheduleDialog } from "../agendamentos/components/schedule-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Schedule } from "../agendamentos/types/schedule";
import { ScheduleDeleteDialog } from "../agendamentos/components/schedule-delete-dialog";
import { City } from "../cidades/types/city";
import { PriorityDeleteDialog } from "./components/priority-delete-dialog";
import { useUser } from "@/hooks/useUser";
import { PriorityDialog } from "./components/priority-dialog";
import { CityPlaceSelect } from "@/components/city-place-select";

export default function AvailabilityPage() {
  const now = new Date();
  const threeDaysAgo = new Date(new Date(now).setDate(now.getDate() - 3));
  const sevenDaysAfter = new Date(new Date(now).setDate(now.getDate() + 7));

  const { user } = useUser();

  const [startDate, setStartDate] = useState<Date>(threeDaysAgo);
  const [endDate, setEndDate] = useState<Date>(sevenDaysAfter);
  const [city, setCity] = useState<City>();
  const [cityPlace, setCityPlace] = useState<any>();
  const [cities, setCities] = useState<{ id: string; name: string; color: string;}[]>([]);
  const [vendors, setVendors] = useState([]);
  const [dialogData, setDialogData] = useState<Availability | null>(null);
  const [deleteData, setDeleteData] = useState<{ slotId: string } | null>(null);
  const [scheduleData, setScheduleData] = useState<Partial<Schedule> | null>(null);
  const [deleteScheduleData, setScheduleDeleteData] = useState<Schedule | null>(null);
  const [schedulePopover, setSchedulePopover] = useState<string>();
  const [priorityData, setPriorityData] = useState<{ availabilityId: string } | null>(null);
  const [deletePriorityData, setDeletePriorityData] = useState<{ priorityId: string } | null>(null);
  const [priorityPopover, setPriorityPopover] = useState<string>();
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const cityId = useMemo(() => city?.id, [city]);
  const cityPlaceId = useMemo(() => cityPlace?.id, [cityPlace]);

  const dateDiff = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

    return Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const { data: events, error: eventsError, isLoading: eventsLoading } = useSWR(
    ["events", startDate, endDate],
    async ([_, startDate, endDate]) => {
      const start = startDate.toISOString().split("T")[0];
      const end = endDate.toISOString().split("T")[0];
      const response = await fetch(
        `https://n8n.eventosindaia.com.br/webhook/agendamentos/eventos?startDate=${start}&endDate=${end}`, 
        {
          method: "GET",
        }
      )
      const json = await response.json();
      if (!response.ok) throw new Error(json.message ?? "Erro ao buscar eventos");
      return json;
    }, {
      revalidateOnFocus: false,
      refreshInterval: 0,
    }
  )

  const filteredEvents = useMemo(() => {
    let result = events ?? [];
    if (city?.name) result = result.filter((r) => r["Cidade"].toLowerCase().includes(city.name.toLowerCase()));
    return result;
  }, [events, city])

  const { data: availabilities, isLoading, mutate } = useSWR(
    ["availability", startDate, endDate],
    ([_, startDate, endDate]) => fetchAvailabilities({ startDate, endDate })
  );

  const filteredAvailabilities = useMemo(() => {
    let result = availabilities ?? [];
    if (cityId && cityId !== "all") result = result.filter((r) => r.cityId === cityId);
    if (cityPlaceId && cityPlaceId !== "all") result = result.filter((r) => r.schedule.some((s) => s.cityPlaceId === cityPlaceId));
    return result;
  }, [availabilities, cityId, cityPlaceId]);

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
        <ScheduleDialog customLabel="Novo Agendamento" onSuccess={mutate} />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <Label>Cidade</Label>
          <div className="flex flex-row items-center gap-2">
            <CitySelect value={cityId ?? ""} onSelect={setCity} showAll />
            {cityId && <X className="transition-all cursor-pointer hover:opacity-75" onClick={() => setCity(undefined)}/>}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <Label>Local</Label>
          <div className="flex flex-row items-center gap-2">
            <CityPlaceSelect value={cityPlaceId ?? ""} onSelect={setCityPlace} showAll />
            {cityPlaceId && <X className="transition-all cursor-pointer hover:opacity-75" onClick={() => setCityPlace(undefined)}/>}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <Label>Vendedor</Label>
          <VendorMultiSelect value={vendors} onSelect={setVendors} showAll />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <Label>Início</Label>
          <DatePicker date={startDate} setDate={(date) => setStartDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())))} max={endDate} />
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <Label>Fim</Label>
          <DatePicker date={endDate} setDate={(date) => setEndDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())))} min={startDate} />
        </div>
      </div>

      <div className="flex flex-row items-center gap-2">
        {city && city.id !== "all" ? (
          <div key={city.id} className={`${getColor(city.color)} border rounded-md px-2 py-0.5 text-sm`}>
            {city.name}
          </div>
        ) : (
          cities.map((city) => (
            <div key={city.id} className={`${city.color} border rounded-md px-2 py-0.5 text-sm`}>
              {city.name}
            </div>
          ))
        )}
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
                <TableHead className="border w-28 min-w-28 text-center">Eventos</TableHead>
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
                const dateStrBr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                const eventsOnDate = filteredEvents?.filter((event) => event["Data Realização"] === dateStrBr);
                return (
                  <TableRow key={dateStr}>
                    <TableCell className="border text-right">{dateStrBr}</TableCell>
                    <TableCell className="border text-center">
                      {eventsLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary self-center"/>
                      ) : eventsError ? (
                        <p className="text-destructive font-medium">{eventsError.message ?? "Falha ao carregar"}</p>
                      ) : (
                        eventsOnDate.length > 0 ? (
                          <Popover>
                            <PopoverTrigger>
                              {`${eventsOnDate.length} Evento(s)`}
                            </PopoverTrigger>
                            <PopoverContent className="items-center max-h-64 max-w-64 p-0 overflow-y-auto">
                              {eventsOnDate.map((event, index) => (
                                <p key={index} className={`${index > 0 ? "border-t" : ""} py-1 px-2 text-center`}>
                                  {event["Resumo"]}
                                </p>
                              ))}
                            </PopoverContent>
                          </Popover>
                        ) : (
                          "-"
                        )
                      )} 
                    </TableCell>
                    {vendors.map((v: any) => {
                      const slots = filteredAvailabilities?.filter(a => a.vendorId === v.id && a.date === dateStr).sort((a, b) => a.startHour.localeCompare(b.startHour));
                      
                      const cellId = v.id + "-" + dateStr;
                      const isSelected = selectedCell === cellId;
                      const slotsToCopy = slots.map(s => ({ cityId: s.cityId, startHour: s.startHour, endHour: s.endHour }));
                      
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
                            {slots.map((s) => {
                              const color = cities.find((c) => c.id === s.cityId)?.color;
                              const schedule = s.schedule?.[0];
                              const hasPriority = s.availabilityPriority && s.availabilityPriority.length > 0 && schedule === undefined;
                              return (
                                <div key={s.id} className={`rounded ${hasPriority ? "ring-2 ring-orange-500" : "ring-0"}`}>
                                  <ContextMenu modal={false}>
                                    <ContextMenuTrigger asChild>
                                      <div
                                        className={
                                          "flex items-center gap-0.5 px-1 py-0.5 border rounded transition-all cursor-pointer select-none " +
                                          (schedule ? `opacity-75 ${getColor("red")}` : `hover:opacity-75 ${color ?? ""}`)
                                        }
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          if (schedule) setSchedulePopover(s.id);
                                          else setDialogData(s);
                                        }}
                                      >
                                        <span className="font-medium text-[10px] leading-[14px]">{s.startHour}-{s.endHour}</span>
                                        {!schedule && (
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
                                        )}
                                      </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                      <ContextMenuItem onClick={() => setDialogData(s)} disabled={schedule !== undefined}>
                                        Editar Disponibilidade
                                      </ContextMenuItem>
                                      <ContextMenuItem onClick={() => setDeleteData({ slotId: s.id })} disabled={schedule !== undefined}>
                                        Remover Disponibilidade
                                      </ContextMenuItem>
                                      <ContextMenuSeparator/>
                                      <ContextMenuItem onClick={() => setTimeout(() => setPriorityData({ availabilityId: s.id }), 300)} disabled={schedule !== undefined}>
                                        Reservar
                                      </ContextMenuItem>
                                      <ContextMenuItem onClick={() => setTimeout(() => setPriorityPopover(s.id), 300)} disabled={!hasPriority}>
                                        Ver Reservas
                                      </ContextMenuItem>
                                      <ContextMenuSeparator/>
                                      <ContextMenuItem
                                        onClick={() => setScheduleData({
                                          vendorId: s.vendorId,
                                          cityId: s.cityId,
                                          availabilityId: s.id,
                                          date: s.date,
                                        })}
                                        disabled={schedule !== undefined}
                                      >
                                        Novo Agendamento
                                      </ContextMenuItem>
                                      <ContextMenuItem onClick={() => setScheduleData(schedule)} disabled={schedule === undefined}>
                                        Editar Agendamento
                                      </ContextMenuItem>
                                      <ContextMenuItem onClick={() => setScheduleDeleteData(schedule)} disabled={schedule === undefined}>
                                        Remover Agendamento
                                      </ContextMenuItem>
                                    </ContextMenuContent>
                                  </ContextMenu>

                                  {schedule && (
                                    <Popover open={schedulePopover === s.id} onOpenChange={() => setSchedulePopover(undefined)}>
                                      <PopoverTrigger asChild>
                                        <button
                                          className="absolute top-0 left-0 w-full h-full"
                                          style={{ pointerEvents: "none" }}
                                        />
                                      </PopoverTrigger>
                                      <PopoverContent className="text-sm">
                                        {schedule.externalCode && (<p><b>Código:</b> {schedule.externalCode}</p>)}
                                        <p><b>Cliente:</b> {schedule.clientName}</p>
                                        <p><b>Telefone:</b> {schedule.clientPhone}</p>
                                        {schedule.preVendor?.nome && (<p><b>Pré-vendedor:</b> {schedule.preVendor.nome}</p>)}
                                        {schedule.vendor?.nome && (<p><b>Vendedor:</b> {schedule.vendor.nome}</p>)}
                                        {schedule.city?.name && (<p><b>Cidade:</b> {schedule.city.name}</p>)}
                                        {schedule.cityPlace?.nome && (<p><b>Local:</b> {schedule.cityPlace.nome}</p>)}
                                      </PopoverContent>
                                    </Popover>
                                  )}

                                  {hasPriority && (
                                    <Popover open={priorityPopover === s.id} onOpenChange={() => setPriorityPopover(undefined)}>
                                      <PopoverTrigger asChild>
                                        <button
                                          className="absolute top-0 left-0 w-full h-full"
                                          style={{ pointerEvents: "none" }}
                                        />
                                      </PopoverTrigger>
                                      <PopoverContent className="flex flex-col gap-2 text-sm max-h-64 overflow-y-auto">
                                        {s.availabilityPriority
                                          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                          .map((ap) => (
                                          <div key={ap.id} className="flex flex-row items-center justify-between gap-4">
                                            <div>
                                              <p className="font-semibold underline">{ap.user.nome}</p>
                                              {ap.comment && <p className="whitespace-break-spaces text-xs">{ap.comment}</p>}
                                              <p className="text-gray-400 text-xs">{new Date(ap.createdAt).toLocaleDateString()} {new Date(ap.createdAt).toLocaleTimeString()}</p>
                                            </div>
                                            {user?.id === ap.userId && (
                                              <Button
                                                variant="destructive" 
                                                size="icon"
                                                className="!h-7 !w-7"
                                                onClick={() => setDeletePriorityData({ priorityId: ap.id })}
                                              >
                                                <Trash/>
                                              </Button>
                                            )}
                                          </div>
                                        ))}
                                      </PopoverContent>
                                    </Popover>
                                  )}
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

          {scheduleData && (
            <ScheduleDialog
              schedule={scheduleData}
              onSuccess={mutate}
              defaultOpen={scheduleData !== null}
              onClose={() => setScheduleData(null)}
            />
          )}

          {deleteScheduleData && (
            <ScheduleDeleteDialog
              schedule={deleteScheduleData}
              onSuccess={mutate}
              defaultOpen={deleteScheduleData !== null}
              onClose={() => setScheduleDeleteData(null)}
            />
          )}

          {priorityData && (
            <PriorityDialog
              open={!!priorityData}
              onClose={() => setPriorityData(null)}
              onCreate={mutate}
              availabilityId={priorityData.availabilityId}
            />
          )}

          {deletePriorityData && (
            <PriorityDeleteDialog
              open={!!deletePriorityData}
              onClose={() => setDeletePriorityData(null)}
              priorityId={deletePriorityData.priorityId}
              onDelete={mutate}
            />
          )}
        </div>
      )}
    </div>
  );
}
