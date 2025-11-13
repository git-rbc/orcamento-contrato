"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createAvailability } from "./actions";
import type { Availability } from "../types/availability";

type CopiedSlot = Pick<Availability, "cityId" | "cityPlaceId" | "startHour" | "endHour">;

export function useCopyPasteSlots(cityId?: string, onCreated?: () => void) {
  const [copiedSlots, setCopiedSlots] = useState<CopiedSlot[] | null>(null);
  const [pastingCells, setPastingCells] = useState<Set<string>>(new Set());

  const handleCopy = (selected: HTMLElement | null) => {
    if (!selected) return;

    const slots = selected.getAttribute("data-slots");
    if (!slots) {
      toast.error("Nenhuma disponibilidade encontrada para copiar.");
      return;
    }

    const parsed = JSON.parse(slots);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const formatted = parsed.map((s: any) => ({
        cityId: s.cityId,
        cityPlaceId: s.cityPlaceId,
        startHour: s.startHour,
        endHour: s.endHour,
      }));
      setCopiedSlots(formatted);
      toast.success("Disponibilidades copiadas com sucesso!");
      return;
    }

    toast.error("Nenhuma disponibilidade válida para copiar.");
  };

  const handlePaste = async (selected: HTMLElement | null) => {
    if (!copiedSlots || !copiedSlots.length) {
      toast.error("Nenhuma disponibilidade copiada para colar.");
      return;
    }

    if (!selected) {
      toast.error("Selecione uma célula para colar.");
      return;
    }

    const vendorId = selected.getAttribute("data-vendor-id");
    const date = selected.getAttribute("data-date");

    if (!vendorId || !date) {
      toast.error("Dados da célula inválidos.");
      return;
    }

    const key = `${vendorId}_${date}`;
    if (pastingCells.has(key)) {
      return;
    }

    setPastingCells((prev) => new Set(prev).add(key));

    let anySuccess = false;
    for (const s of copiedSlots) {
      const { error } = await createAvailability({
        cityId: s.cityId,
        cityPlaceId: s.cityPlaceId,
        vendorId,
        date,
        startHour: s.startHour,
        endHour: s.endHour,
      });

      if (error) {
        toast.error(error.message);
        continue;
      }

      anySuccess = true;
    }
    
    setPastingCells((prev) => {
      const updated = new Set(prev);
      updated.delete(key);
      return updated;
    });

    if (anySuccess) {
      toast.success("Disponibilidades coladas com sucesso!");
      onCreated?.();
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    const selected = document.querySelector("[data-selected-cell='true']") as HTMLElement | null;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      handleCopy(selected);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      await handlePaste(selected);
    }
  };

  return { handleKeyDown };
}
