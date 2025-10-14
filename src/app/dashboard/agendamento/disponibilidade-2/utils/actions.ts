import { createClient } from "@/lib/supabase"
import { Availability } from "../types/availability"

export async function fetchAvailabilities(cityId: string, vendorIds: string[], startDate: Date, endDate: Date) {
  const supabase = createClient()

  const startIso = startDate.toISOString().split("T")[0]
  const endIso = endDate.toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .eq("cityId", cityId)
    .in("vendorId", vendorIds)
    .gte("date", startIso)
    .lte("date", endIso)
  if (error) {
    console.error("Erro ao buscar disponibilidades:", error)
    throw new Error("Erro ao buscar disponibilidades: " + error.message)
  }

  return data as Availability[]
}

export async function createAvailability(slot: Omit<Availability, "id" | "createdAt" | "updatedAt">) {
  const supabase = createClient()

  const timeToMinutes = (time: string): number => {
    if (!time || time.length !== 5 || time[2] !== ':') {
      throw new Error("Formato de hora inválido. Use HH:MM.")
    }
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const newStart = timeToMinutes(slot.startHour)
  const newEnd = timeToMinutes(slot.endHour)

  if (newEnd <= newStart) {
    throw new Error("O horário de fim deve ser posterior ao horário de início.")
  }

  const { data: existingSlots, error: fetchError } = await supabase
    .from("availability")
    .select("startHour, endHour")
    .eq("vendorId", slot.vendorId)
    .eq("cityId", slot.cityId)
    .eq("date", slot.date)
    
  if (fetchError) throw new Error("Erro ao verificar sobreposição: " + fetchError.message)

  const overlaps = existingSlots?.some((a: any) => {
    const existingStart = timeToMinutes(a.startHour)
    const existingEnd = timeToMinutes(a.endHour)
    
    const isOverlapping = newStart < existingEnd && newEnd > existingStart

    return isOverlapping
  })

  if (overlaps) {
    throw new Error("Essa disponibilidade sobrepõe outra existente.")
  }

  const { data, error } = await supabase
    .from("availability")
    .insert([slot as any]) 
    .select()

  if (error) {
    console.error("Erro ao criar disponibilidade:", error)
    throw new Error("Erro ao criar disponibilidade: " + error.message)
  }

  return data[0]
}

export async function deleteAvailability(id: string) {
  const supabase = (await import("@/lib/supabase")).createClient();

  const { error } = await supabase.from("availability").delete().eq("id", id);

  if (error) throw new Error(error.message);

  return true;
}
