"use server";
import { Availability } from "../types/availability"
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function fetchAvailabilities(props: {
  cityId?: string, 
  startDate: Date,
  endDate: Date
}) {
  const { cityId, startDate, endDate } = props;
  const supabase = await createServerSupabaseClient()

  const startIso = startDate.toISOString().split("T")[0]
  const endIso = endDate.toISOString().split("T")[0]
  
  const query = supabase
    .from("availability")
    .select("*, vendor: users(*), city(*), schedule(*, preVendor:preVendorId(*), vendor:vendorId(*), city(*), cityPlace:espacos_eventos(*))")
    .gte("date", startIso)
    .lte("date", endIso)

  if (cityId) query.eq("cityId", cityId)

  const { data, error } = await query;

  if (error) throw new Error(error.message)

  return data as Availability[];
}

async function validateAvailabilitySchedule(props: {
  id: string;
}) {
  const { id } = props;

  const supabase = await createServerSupabaseClient();

  const { data } = await supabase.from("availability").select("*, schedule(availabilityId)").eq("id", id);

  if (data?.[0]?.schedule.length > 0) return { error: new Error("Horário possui agendamento vinculado") };

  return { error: undefined };
}

async function validateAvailability(props: {
  id?: string;
  cityId: string;
  vendorId: string;
  date: string;
  startHour: string;
  endHour: string;
}) {
  const { id, vendorId, date, startHour, endHour } = props;
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

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .eq("vendorId", vendorId)
    .eq("date", date);

  if (error) return { error };

  const overlaps = data?.some((a: any) => {
    const existingStart = timeToMinutes(a.startHour)
    const existingEnd = timeToMinutes(a.endHour)
    
    const isOverlapping = newStart < existingEnd && newEnd > existingStart

    return a.id !== id && isOverlapping
  });

  if (overlaps) return { error: new Error(`A disponibilidade ${startHour}-${endHour} sobrepõe outra existente.`) };

  return { error: undefined };
}

export async function createAvailability(props: {
  cityId: string;
  vendorId: string;
  date: string;
  startHour: string;
  endHour: string;
}) {
  const supabase = await createServerSupabaseClient()

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
  const { id, cityId, startHour, endHour } = props;

  const supabase = await createServerSupabaseClient()

  const { error: validateScheduleError } = await validateAvailabilitySchedule({ id });
  if (validateScheduleError) return { error: validateScheduleError };

  const { error: validateError } = await validateAvailability(props);
  if (validateError) return { error: validateError };

  const { error } = await supabase.from("availability").update({ cityId, startHour, endHour }).eq("id", id);

  return { error };
}

export async function deleteAvailability(props: {
  id: string
}) {
  const { id } = props;

  const supabase = await createServerSupabaseClient();

  const { error: validateScheduleError } = await validateAvailabilitySchedule({ id });
  if (validateScheduleError) return { error: validateScheduleError };

  const { error } = await supabase.from("availability").delete().eq("id", id);

  return { error };
}
