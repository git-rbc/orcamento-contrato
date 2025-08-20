import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const { nova_data, nova_hora_inicio, nova_hora_fim, motivo } = body;

    if (!nova_data || !nova_hora_inicio || !nova_hora_fim) {
      return NextResponse.json(
        { error: 'Nova data e horários são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a reunião existe
    const { data: reuniao, error: reuniaoError } = await supabase
      .from('reunioes')
      .select('*')
      .eq('id', id)
      .single();

    if (reuniaoError) {
      return NextResponse.json(
        { error: 'Reunião não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se o vendedor está disponível no novo horário
    const { data: conflitos } = await supabase
      .from('reunioes')
      .select('id')
      .eq('vendedor_id', reuniao.vendedor_id)
      .eq('data', nova_data)
      .neq('id', id) // Excluir a própria reunião
      .neq('status', 'cancelada')
      .or(`and(hora_inicio.lte.${nova_hora_fim},hora_fim.gte.${nova_hora_inicio})`);

    if (conflitos && conflitos.length > 0) {
      return NextResponse.json(
        { error: 'Vendedor já possui reunião agendada no novo horário' },
        { status: 409 }
      );
    }

    // Verificar se existe bloqueio do vendedor na nova data
    const { data: bloqueios } = await supabase
      .from('bloqueios_vendedores')
      .select('id')
      .eq('vendedor_id', reuniao.vendedor_id)
      .eq('ativo', true)
      .lte('data_inicio', nova_data)
      .gte('data_fim', nova_data);

    if (bloqueios && bloqueios.length > 0) {
      return NextResponse.json(
        { error: 'Vendedor possui bloqueio na nova data solicitada' },
        { status: 409 }
      );
    }

    // Configurar contexto para o trigger de histórico
    await supabase.rpc('set_config', {
      setting_name: 'app.current_user_id',
      setting_value: user.id,
      is_local: true
    });

    // Atualizar a reunião
    const { data, error } = await supabase
      .from('reunioes')
      .update({
        data: nova_data,
        hora_inicio: nova_hora_inicio,
        hora_fim: nova_hora_fim,
        status: 'reagendada',
        confirmada_cliente: false, // Resetar confirmações após reagendamento
        confirmada_vendedor: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao reagendar reunião:', error);
      return NextResponse.json(
        { error: 'Erro ao reagendar reunião' },
        { status: 500 }
      );
    }

    // Adicionar motivo ao histórico se fornecido
    if (motivo) {
      await supabase
        .from('reunioes_historico')
        .update({ motivo })
        .eq('reuniao_id', id)
        .order('reagendada_em', { ascending: false })
        .limit(1);
    }

    return NextResponse.json({ 
      data,
      message: 'Reunião reagendada com sucesso'
    });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}