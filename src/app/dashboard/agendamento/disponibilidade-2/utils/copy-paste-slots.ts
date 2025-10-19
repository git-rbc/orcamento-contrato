"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createAvailability } from "./actions";
import type { Availability } from "../types/availability";

type CopiedSlot = Pick<Availability, "startHour" | "endHour">;

export function useCopyPasteSlots(cityId?: string, onCreated?: () => void) {
  const [copiedSlots, setCopiedSlots] = useState<CopiedSlot[] | null>(null);

  const handleCopy = (selected: HTMLElement | null) => {
    if (!selected) return;

    const slots = selected.getAttribute("data-slots");
    if (!slots) {
      toast.error("Nenhum slot encontrado para copiar.");
      return;
    }

    const parsed = JSON.parse(slots);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const formatted = parsed.map((s: any) => ({
        startHour: s.startHour,
        endHour: s.endHour,
      }));
      setCopiedSlots(formatted);
      toast.success("Slots copiados com sucesso!");
      return;
    }

    toast.error("Nenhum slot válido para copiar.");
  };

  const handlePaste = async (selected: HTMLElement | null) => {
    if (!copiedSlots || !copiedSlots.length) {
      toast.error("Nenhum slot copiado para colar.");
      return;
    }

    if (!cityId) {
      toast.error("Selecione uma cidade antes de colar.");
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

    for (const s of copiedSlots) {
      const { error } = await createAvailability({
        cityId,
        vendorId,
        date,
        startHour: s.startHour,
        endHour: s.endHour,
      });

      if (error) {
        toast.error(error.message);
        return;
      }
    }

    toast.success("Slots colados com sucesso!");
    onCreated?.();
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
