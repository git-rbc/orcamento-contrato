import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Seleciona apenas id e nome, e ordena por nome
    const { data, error } = await supabase
      .from('espacos_eventos')
      .select('id, nome, cidade')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao listar espaços:', error);
      return NextResponse.json({ error: 'Erro ao listar espaços' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Erro na API de listagem de espaços:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 