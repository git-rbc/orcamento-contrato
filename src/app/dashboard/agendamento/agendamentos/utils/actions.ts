"use server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

async function validateSchedule(props: {
  availabilityId: string;
}) {
 const { availabilityId } = props;

  const supabase = await createServerSupabaseClient();

  const { data } = await supabase.from("availability").select("*, schedule(availabilityId)").eq("id", availabilityId);

  if (!data) return { error: new Error("Slot não encontrado") };
  if (data[0].schedule.length > 0) return { error: new Error("Slot já possui agendamento") };

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