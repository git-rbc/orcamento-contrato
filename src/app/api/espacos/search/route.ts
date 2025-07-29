import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    let query = supabase
      .from('espacos_eventos')
      .select('id, nome, capacidade_maxima, cidade')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (q) {
      query = query.ilike('nome', `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar espaços:', error);
      return NextResponse.json({ error: 'Erro ao buscar espaços' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [] 
    });

  } catch (error) {
    console.error('Erro na API de espaços:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}