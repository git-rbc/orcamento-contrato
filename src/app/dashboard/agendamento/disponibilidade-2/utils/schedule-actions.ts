import { createClient } from "@/lib/supabase";

export async function fetchAvailableSlots({
  vendorId,
  cityId,
  date,
}: {
  vendorId: string;
  cityId: string;
  date: string;
}) {
  const supabase = createClient();

  const { data: allSlots, error: availabilityError } = await supabase
    .from("availability")
    .select("id, startHour, endHour")
    .eq("vendorId", vendorId)
    .eq("cityId", cityId)
    .eq("date", date);

  if (availabilityError) return { data: [], error: availabilityError };

  const { data: scheduled, error: scheduleError } = await supabase
    .from("schedule")
    .select("availabilityId")
    .eq("date", date);

  if (scheduleError) return { data: [], error: scheduleError };

  const scheduledIds = scheduled?.map((s) => s.availabilityId) || [];
  const freeSlots = allSlots?.filter((slot) => !scheduledIds.includes(slot.id)) || [];

  return { data: freeSlots, error: null };
}

export async function createSchedule(schedule: {
  externalCode?: string | null;
  clientName: string;
  clientPhone: string;
  preVendorId: string | null;
  vendorId: string | null;
  cityId: string | null;
  placeId: string | null;
  date: string;
  availabilityId: string;
}) {
  const supabase = createClient();

  const { data: existing, error: checkError } = await supabase
    .from("schedule")
    .select("id")
    .eq("availabilityId", schedule.availabilityId)
    .maybeSingle();

  if (checkError) return { error: checkError };
  if (existing) return { error: { message: "O slot selecionado já foi agendado." } };

  const now = new Date().toISOString();

  const scheduleData = {
    externalCode: schedule.externalCode || null,
    clientName: schedule.clientName,
    clientPhone: schedule.clientPhone,
    preVendorId: schedule.preVendorId || null,
    vendorId: schedule.vendorId || null,
    cityId: schedule.cityId || null,
    placeId: schedule.placeId || null,
    date: schedule.date,
    availabilityId: schedule.availabilityId,
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabase
    .from("schedule")
    .insert([scheduleData])
    .select();

  if (error) return { error };
  return { data, error: null };
}
export async function fetchSchedules({
  cityId,
  startDate,
  endDate,
}: {
  cityId?: string;
  startDate: Date;
  endDate: Date;
}) {
  const supabase = createClient();

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  let query = supabase
    .from("schedule")
    .select(`
      id,
      clientName,
      clientPhone,
      date,
      vendorId,
      cityId,
      availability:availabilityId (startHour, endHour),
      vendor:vendorId (nome),
      preVendor:preVendorId (nome)`
    )
    .gte("date", startStr).lte("date", endStr);

  if (cityId) {
    query = query.eq("cityId", cityId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return { data: [], error };
  }

  return { data: data || [], error: null };
}