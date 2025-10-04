"use server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { CityPlace } from "../types/cityPlace"; 
import { revalidatePath } from "next/cache";

export async function getCityPlace(props: {
    search?: string;
    page?: number,
    limit?: number,
}) {
    const { search, page = 1, limit = 10 } = props;

    const supabase = await createServerSupabaseClient();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("cityPlace").select("*, city:city(name)", { count: "exact" });

    if (search) {
        query = query.ilike("name", `%${search}%`);
    }

    const { data, error, count } = await query.range(from, to);

    return { data: data as any[] as CityPlace[], error, pageTotal: Math.ceil(count / limit) || 1 };
}

export async function createCityPlace(props: {
    name: string;
    cityId: string;
    color?: string | null;
}) {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('cityPlace').insert(props);

    if (!error) revalidatePath("/dashboard/agendamento/locais-cidades");

    return { error };
}

export async function updateCityPlace(props: {
    id: string;
    name: string;
    cityId: string;
    color?: string | null;
}) {
    const { id, name,cityId } = props;

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('cityPlace').update({ name, cityId }).eq('id', id);

    if (!error) revalidatePath("/dashboard/agendamento/locais-cidades");

    return { error };
}

export async function deleteCityPlace(props: {
    id: string;
}) {
    const { id } = props;

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('cityPlace').delete().eq('id', id);

    if (!error) revalidatePath("/dashboard/agendamento/locais-cidades");

    return { error };
}