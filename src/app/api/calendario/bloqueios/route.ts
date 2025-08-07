import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const { searchParams } = new URL(request.url);
    
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const espacoId = searchParams.get('espaco_id');

    let query = supabase
      .from('bloqueios_datas')
      .select(`
        *,
        espaco:espacos_eventos(nome)
      `);

    if (dataInicio) {
      query = query.gte('data_inicio', dataInicio);
    }

    if (dataFim) {
      query = query.lte('data_fim', dataFim);
    }

    if (espacoId) {
      query = query.eq('espaco_evento_id', espacoId);
    }

    const { data, error } = await query.order('data_inicio', { ascending: true });

    if (error) {
      console.error('Erro ao buscar bloqueios:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar bloqueios' },
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const body = await request.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('bloqueios_datas')
      .insert({
        ...body,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar bloqueio:', error);
      return NextResponse.json(
        { error: 'Erro ao criar bloqueio' },
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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID do bloqueio é obrigatório' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('bloqueios_datas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar bloqueio:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar bloqueio' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}