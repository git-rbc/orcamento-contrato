import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const body = await request.json();
    
    const { espaco_id, data_inicio, data_fim, exclude_id } = body;

    if (!espaco_id || !data_inicio || !data_fim) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Verificar reservas conflitantes
    let reservasQuery = supabase
      .from('reservas_espacos')
      .select('id, titulo, data_inicio, data_fim, status')
      .eq('espaco_evento_id', espaco_id)
      .neq('status', 'cancelado');

    // Verificar sobreposição de datas
    reservasQuery = reservasQuery.or(
      `and(data_inicio.lte.${data_fim},data_fim.gte.${data_inicio})`
    );

    if (exclude_id) {
      reservasQuery = reservasQuery.neq('id', exclude_id);
    }

    const { data: reservasConflito, error: reservasError } = await reservasQuery;

    if (reservasError) {
      console.error('Erro ao verificar reservas:', reservasError);
      return NextResponse.json(
        { error: 'Erro ao verificar disponibilidade' },
        { status: 500 }
      );
    }

    // Verificar bloqueios conflitantes
    let bloqueiosQuery = supabase
      .from('bloqueios_datas')
      .select('id, motivo, data_inicio, data_fim')
      .eq('espaco_evento_id', espaco_id);

    // Verificar sobreposição de datas
    bloqueiosQuery = bloqueiosQuery.or(
      `and(data_inicio.lte.${data_fim},data_fim.gte.${data_inicio})`
    );

    const { data: bloqueiosConflito, error: bloqueiosError } = await bloqueiosQuery;

    if (bloqueiosError) {
      console.error('Erro ao verificar bloqueios:', bloqueiosError);
      return NextResponse.json(
        { error: 'Erro ao verificar disponibilidade' },
        { status: 500 }
      );
    }

    const disponivel = 
      (!reservasConflito || reservasConflito.length === 0) && 
      (!bloqueiosConflito || bloqueiosConflito.length === 0);

    return NextResponse.json({
      disponivel,
      conflitos: {
        reservas: reservasConflito || [],
        bloqueios: bloqueiosConflito || [],
        total_reservas: reservasConflito?.length || 0,
        total_bloqueios: bloqueiosConflito?.length || 0
      }
    });

  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}