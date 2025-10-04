"use server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PreVendor } from "../types/preVendor";
import { revalidatePath } from "next/cache";

export async function getPreVendor(props: {
    search?: string;
    page?: number,
    limit?: number,
}) {
    const { search, page =1, limit = 10 } = props;

    const supabase = await createServerSupabaseClient();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("preVendor").select("*", { count: "exact" });

    if (search) {
        query = query.ilike("name", `%${search}%`);
    }

    const { data, error, count } = await query.range(from, to);

    return { data: data as PreVendor[], error, pageTotal: Math.ceil(count / limit) || 1 };
}

export async function createPreVendor(props: {
    name: string;
}) {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('preVendor').insert(props);

    if (!error) revalidatePath("/dashboard/agendamento/pre-vendedores");

    return { error };
}

export async function updatePreVendor(props: {
    id: string;
    name: string  
}) {
    const { id, name } = props;

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('preVendor').update({ name }).eq('id', id);

    if (!error) revalidatePath("/dashboard/agendamento/pre-vendedores");

    return { error };
}

export async function deletePreVendor(props: {
    id: string;
}) {
    const { id } = props;

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('preVendor').delete().eq('id', id);

    if (!error) revalidatePath("/dashboard/agendamento/pre-vendedores");

    return { error };
}
