import { createClient } from "@/lib/supabase"
import { Availability } from "../types/availability"

export async function fetchAvailabilities(props: {
  cityId: string, 
  vendorIds: string[],
  startDate: Date,
  endDate: Date
}) {
  const { cityId, vendorIds, startDate, endDate } = props;
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

  if (error) throw new Error(error.message)

  return data as Availability[];
}

async function validateAvailability(props: {
  cityId: string;
  vendorId: string;
  date: string;
  startHour: string;
  endHour: string;
}) {
  const { cityId, vendorId, date, startHour, endHour } = props;
  const timeToMinutes = (time: string) => {
    if (!time || time.length !== 5 || time[2] !== ':') return;
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const newStart = timeToMinutes(startHour)
  const newEnd = timeToMinutes(endHour)

  if (!newStart || !newEnd) {
    return { error: new Error("Formato de hora inválido. Use HH:MM.") }
  } else if (newEnd <= newStart) {
    return { error: new Error("O horário de fim deve ser posterior ao horário de início.") }
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from("availability")
    .select("startHour, endHour")
    .eq("vendorId", vendorId)
    .eq("cityId", cityId)
    .eq("date", date);

  if (error) return { error };

  const overlaps = data?.some((a: any) => {
    const existingStart = timeToMinutes(a.startHour)
    const existingEnd = timeToMinutes(a.endHour)
    
    const isOverlapping = newStart < existingEnd && newEnd > existingStart

    return isOverlapping
  });

  if (overlaps) return { error: new Error("Essa disponibilidade sobrepõe outra existente.") };

  return { error: undefined };
}

export async function createAvailability(props: {
  cityId: string;
  vendorId: string;
  date: string;
  startHour: string;
  endHour: string;
}) {
  const supabase = createClient()

  const { error: validateError } = await validateAvailability(props);
  if (validateError) return { error: validateError };

  const { error } = await supabase.from("availability").insert(props);

  return { error };
}

export async function updateAvailability(props: {
  id: string;
  cityId: string;
  vendorId: string;
  date: string;
  startHour: string;
  endHour: string;
}) {
  const { id, startHour, endHour } = props;

  const supabase = createClient()

  const { error: validateError } = await validateAvailability(props);
  if (validateError) return { error: validateError };

  const { error } = await supabase.from("availability").update({ startHour, endHour }).eq("id", id);

  return { error };
}

export async function deleteAvailability(props: {
  id: string
}) {
  const { id } = props;

  const supabase = createClient();

  const { error } = await supabase.from("availability").delete().eq("id", id);

  return { error };
}
