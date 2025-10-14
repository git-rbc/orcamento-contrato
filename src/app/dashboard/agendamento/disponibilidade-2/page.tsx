"use client";
import { CitySelect } from "@/components/city-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { VendorMultiSelect } from "@/components/vendor-multi-select";
import { useState, useEffect } from "react";
import { fetchAvailabilities } from "./utils/actions";
import { AddSlotDialog } from "./components/add-slot-dialog";
import { DeleteSlotDialog } from "./components/delete-slot-dialog";
import { Button } from "@/components/ui/button";

export default function AvailabilityPage() {
  const now = new Date();
  const threeDaysAgo = new Date(new Date(now).setDate(now.getDate() - 3));
  const sevenDaysAfter = new Date(new Date(now).setDate(now.getDate() + 7));
  const [startDate, setStartDate] = useState<Date>(threeDaysAgo);
  const [endDate, setEndDate] = useState<Date>(sevenDaysAfter);
  const [cityId, setCityId] = useState<string>();
  const [vendors, setVendors] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [dialogData, setDialogData] = useState<{ vendorId: string; date: string } | null>(null);
  const [deleteData, setDeleteData] = useState<{ slotId: string } | null>(null);

  useEffect(() => {
    if (cityId && vendors.length) {
      fetchAvailabilities(cityId, vendors.map(v => v.id), startDate, endDate).then(setAvailabilities);
    }
  }, [cityId, vendors, startDate, endDate]);

  const [, forceRender] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceRender(x => x + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

      {cityId ? (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-100">Data</th>
                {vendors.map((v: any) => (
                  <th key={v.id} className="border p-2 bg-gray-100">
                    {v.nome || v.name || "Sem nome"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1 }).map((_, i) => {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split("T")[0];
                return (
                  <tr key={dateStr}>
                    <td className="border p-2">{d.toLocaleDateString()}</td>
                    {vendors.map((v: any) => {
                      const slots = availabilities.filter(a => a.vendorId === v.id && a.date === dateStr);
                      return (
                        <td key={v.id} className="border p-2 text-sm align-top">
                          <div className="flex flex-row gap-1 overflow-x-auto whitespace-nowrap">
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
                                  className={`flex items-center gap-2 px-2 py-1 border rounded w-max ${colorClass}`}
                                >
                                  <span className="font-medium">{s.startHour} - {s.endHour}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-800 p-0 h-5 w-5"
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
                              className="w-8 h-8 flex-shrink-0"
                            >
                              +
                            </Button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {dialogData && (
            <AddSlotDialog
              open={!!dialogData}
              onClose={() => setDialogData(null)}
              vendorId={dialogData.vendorId}
              cityId={cityId}
              date={dialogData.date}
              onCreated={() =>
                fetchAvailabilities(cityId, vendors.map(v => v.id), startDate, endDate).then(setAvailabilities)
              }
            />
          )}

          {deleteData && (
            <DeleteSlotDialog
              open={!!deleteData}
              onClose={() => setDeleteData(null)}
              slotId={deleteData.slotId}
              onDeleted={() =>
                fetchAvailabilities(cityId, vendors.map(v => v.id), startDate, endDate).then(setAvailabilities)
              }
            />
          )}
        </div>
      ) : (
        <p className="text-sm font-medium">Selecione uma cidade para continuar</p>
      )}
    </div>
  );
}
