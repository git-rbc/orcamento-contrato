"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAvailability } from "../utils/actions";

type AddSlotDialogProps = {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  cityId: string;
  date: string;
  onCreated: () => void;
};

export function AddSlotDialog({
  open,
  onClose,
  vendorId,
  cityId,
  date,
  onCreated,
}: AddSlotDialogProps) {
  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [vendorName, setVendorName] = useState("");
  const [cityName, setCityName] = useState("");

  useEffect(() => {
    if (open && vendorId && cityId) {
      const fetchData = async () => {
        const supabase = (await import("@/lib/supabase")).createClient();
        const [{ data: vendorData }, { data: cityData }] = await Promise.all([
          supabase.from("users").select("nome").eq("id", vendorId).single(),
          supabase.from("city").select("name").eq("id", cityId).single(),
        ]);
        setVendorName(vendorData?.nome || "");
        setCityName(cityData?.name || "");
      };
      fetchData();
    }
  }, [open, vendorId, cityId]);

  const handleSave = async () => {
    if (!startHour || !endHour) return;
    try {
      setLoading(true);
      setError(undefined);
      await createAvailability({
        vendorId,
        cityId,
        date,
        startHour,
        endHour,
      });
      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Slot</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Novo slot de disponibilidade do vendedor na data e cidade selecionada.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div className="text-sm">
            <p><strong>Vendedor:</strong> {vendorName || "Carregando..."}</p>
            <p><strong>Cidade:</strong> {cityName || "Carregando..."}</p>
            <p><strong>Data:</strong> {new Date(date).toLocaleDateString()}</p>
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex flex-col flex-1">
              <label className="text-sm font-medium mb-1">Início</label>
              <Input
                type="time"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
              />
            </div>
            <div className="flex flex-col flex-1">
              <label className="text-sm font-medium mb-1">Fim</label>
              <Input
                type="time"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}