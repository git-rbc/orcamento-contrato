"use server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { Schedule } from "../types/schedule";

export async function getSchedule(props: {
    search?: string;
    page?: number,
    limit?: number,
}) {
    const { search, page = 1, limit = 10 } = props;

    const supabase = await createServerSupabaseClient();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("schedule").select("*, preVendor:preVendorId(*), vendor:vendorId(*), city(*), cityPlace:espacos_eventos(*)", { count: "exact" });

    if (search) {
      query = query.or(`clientName.ilike.%${search}%,clientPhone.ilike.%${search}%`)
    }

    const { data, error, count } = await query.range(from, to);

    return { data: data as Schedule[], error, pageTotal: Math.ceil(count / limit) || 1};
}

async function validateSchedule(props: {
  availabilityId: string;
}) {
 const { availabilityId } = props;

  const supabase = await createServerSupabaseClient();

  const { data } = await supabase.from("availability").select("*, schedule(availabilityId)").eq("id", availabilityId);

  if (!data) return { error: new Error("Horário não encontrado") };
  if (data[0].schedule.length > 0) return { error: new Error("Horário já possui agendamento") };

  return { error: undefined };
}

export async function createSchedule(props: {
  externalCode?: string;
  clientName: string;
  clientPhone: string;
  preVendorId: string;
  vendorId: string;
  cityId: string;
  cityPlaceId: string;
  date: Date;
  availabilityId: string;
}) {
  const supabase = await createServerSupabaseClient();

  const { error: validateError } = await validateSchedule({ availabilityId: props.availabilityId });
  if (validateError) return { error: validateError };

  const { error } = await supabase.from('schedule').insert(props);
  
  if (!error) revalidatePath("/dashboard/agendamento/agendamentos");

  return { error };
}

export async function updateSchedule(props: {
  id: string;
  externalCode?: string;
  clientName: string;
  clientPhone: string;
  preVendorId: string;
  vendorId: string;
  cityId: string;
  cityPlaceId: string;
  date: Date;
  availabilityId: string;
}) {
    const { id, ...values } = props;

    const supabase = await createServerSupabaseClient();

    const { error: validateError } = await validateSchedule({ availabilityId: props.availabilityId });
    if (validateError) return { error: validateError };

    const { error } = await supabase.from('schedule').update(values).eq('id', id);

    if (!error) revalidatePath("/dashboard/agendamento/agendamentos");

    return { error };
}

export async function deleteSchedule(props: {
    id: string;
}) {
    const { id } = props;

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('schedule').delete().eq('id', id);

    if (!error) revalidatePath("/dashboard/agendamento/agendamentos");

    return { error };
}