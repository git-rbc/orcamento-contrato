"use server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { City } from "../types/city";
import { revalidatePath } from "next/cache";

export async function getCity(props: {
    search?: string;
    page?: number,
    limit?: number,
}) {
    const { search, page = 1, limit = 10 } = props;

    const supabase = await createServerSupabaseClient();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("city").select("*", { count: "exact" });

    if (search) {
        query = query.ilike("name", `%${search}`);
    }

    const { data, error, count } = await query.range(from, to);

    return { data: data as City[], error, pageTotal: Math.ceil(count / limit) || 1};
}

export async function createCity(props: {
    name: string;
}) {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('city').insert(props);
    
    if (!error) revalidatePath("/dashboard/agendamento/cidades");

    return { error };
}

export async function updateCity(props: {
    id: string;
    name: string;
}) {
    const { id, name } = props;

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('city').update({ name }).eq('id', id);

    if (!error) revalidatePath("/dashboard/agendamento/cidades");

    return { error };
}

export async function deleteCity(props: {
    id: string;
}) {
    const { id } = props;

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('city').delete().eq('id', id);

    if (!error) revalidatePath("/dashboard/agendamento/cidades");

    return { error };
}