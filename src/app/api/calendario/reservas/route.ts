import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const { searchParams } = new URL(request.url);
    
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const espacoId = searchParams.get('espaco_id');
    const status = searchParams.get('status');
    const clienteId = searchParams.get('cliente_id');

    let query = supabase
      .from('reservas_espacos')
      .select(`
        *,
        cliente:clientes(nome, telefone, email),
        espaco:espacos_eventos(nome, capacidade),
        contrato:contratos(numero_contrato)
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

    if (status) {
      query = query.eq('status', status);
    }

    if (clienteId) {
      query = query.eq('cliente_id', clienteId);
    }

    const { data, error } = await query.order('data_inicio', { ascending: true });

    if (error) {
      console.error('Erro ao buscar reservas:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar reservas' },
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
      .from('reservas_espacos')
      .insert({
        ...body,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar reserva:', error);
      return NextResponse.json(
        { error: 'Erro ao criar reserva' },
        { status: 500 }
      );
    }

    // Se solicitado, criar bloqueios adjacentes
    if (body.criar_bloqueio) {
      const dataInicio = new Date(body.data_inicio);
      const dataFim = new Date(body.data_fim);
      
      // Bloqueio dia anterior
      const diaAnterior = new Date(dataInicio);
      diaAnterior.setDate(diaAnterior.getDate() - 1);
      
      // Bloqueio dia posterior
      const diaPosterior = new Date(dataFim);
      diaPosterior.setDate(diaPosterior.getDate() + 1);

      await supabase.from('bloqueios_datas').insert([
        {
          espaco_evento_id: body.espaco_evento_id,
          data_inicio: diaAnterior.toISOString().split('T')[0],
          data_fim: diaAnterior.toISOString().split('T')[0],
          motivo: 'Preparação do evento',
          created_by: user.id
        },
        {
          espaco_evento_id: body.espaco_evento_id,
          data_inicio: diaPosterior.toISOString().split('T')[0],
          data_fim: diaPosterior.toISOString().split('T')[0],
          motivo: 'Limpeza pós-evento',
          created_by: user.id
        }
      ]);
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

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da reserva é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('reservas_espacos')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar reserva:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar reserva' },
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
        { error: 'ID da reserva é obrigatório' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('reservas_espacos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar reserva:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar reserva' },
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