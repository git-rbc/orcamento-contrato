import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('reunioes_historico')
      .select('*')
      .eq('reuniao_id', id)
      .order('reagendada_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar histórico da reunião:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar histórico da reunião' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}