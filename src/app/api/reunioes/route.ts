import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notificationService } from '@/lib/notification-service';
import { conflictDetector } from '@/lib/conflict-detector';
// import { enviarEmailReuniao } from '@/services/email-reunioes';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const vendedorId = searchParams.get('vendedor_id');
    const clienteId = searchParams.get('cliente_id');
    const espacoId = searchParams.get('espaco_id');
    const status = searchParams.get('status');
    const tipoReuniaoId = searchParams.get('tipo_reuniao_id');
    
    // Novos filtros da Fase 4
    const preVendedorId = searchParams.get('pre_vendedor_id');
    const localAtendimento = searchParams.get('local_atendimento');
    const origem = searchParams.get('origem');
    const campanha = searchParams.get('campanha');

    let query = supabase
      .from('v_reunioes_completa')
      .select('*');

    if (dataInicio) {
      query = query.gte('data', dataInicio);
    }

    if (dataFim) {
      query = query.lte('data', dataFim);
    }

    if (vendedorId && vendedorId !== 'todos') {
      query = query.eq('vendedor_id', vendedorId);
    }

    if (clienteId && clienteId !== 'todos') {
      query = query.eq('cliente_id', clienteId);
    }

    if (espacoId && espacoId !== 'todos') {
      query = query.eq('espaco_evento_id', espacoId);
    }

    if (status && status !== 'todos') {
      query = query.eq('status', status);
    }

    if (tipoReuniaoId && tipoReuniaoId !== 'todos') {
      query = query.eq('tipo_reuniao_id', tipoReuniaoId);
    }

    // Novos filtros da Fase 4
    if (preVendedorId && preVendedorId !== 'todos') {
      query = query.eq('pre_vendedor_id', preVendedorId);
    }

    if (localAtendimento && localAtendimento !== 'todos') {
      query = query.eq('local_atendimento', localAtendimento);
    }

    // Filtros de origem e campanha através da tabela de clientes
    if (origem && origem !== 'todos') {
      query = query.eq('cliente_origem', origem);
    }

    if (campanha && campanha !== 'todos') {
      query = query.eq('cliente_campanha', campanha);
    }

    const { data, error } = await query.order('data', { ascending: true }).order('hora_inicio', { ascending: true });

    if (error) {
      console.error('Erro ao buscar reuniões:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar reuniões' },
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
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // Verificar conflitos usando o detector de conflitos
    const validacao = await conflictDetector.validarAgendamento(
      body.vendedor_id,
      body.data,
      body.hora_inicio,
      body.hora_fim
    );

    if (!validacao.valido) {
      return NextResponse.json(
        { 
          error: validacao.mensagem || 'Conflito de horário detectado',
          conflito: validacao.conflito 
        },
        { status: 409 }
      );
    }

    // Verificar se existe bloqueio do vendedor
    const { data: bloqueios } = await supabase
      .from('bloqueios_vendedores')
      .select('id')
      .eq('vendedor_id', body.vendedor_id)
      .eq('ativo', true)
      .lte('data_inicio', body.data)
      .gte('data_fim', body.data);

    if (bloqueios && bloqueios.length > 0) {
      return NextResponse.json(
        { error: 'Vendedor possui bloqueio na data solicitada' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('reunioes')
      .insert({
        ...body,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar reunião:', error);
      return NextResponse.json(
        { error: 'Erro ao criar reunião' },
        { status: 500 }
      );
    }

    // Buscar dados completos da reunião para notificações
    const { data: reuniaoCompleta } = await supabase
      .from('v_reunioes_completa')
      .select('*')
      .eq('id', data.id)
      .single();

    if (reuniaoCompleta) {
      try {
        // Enviar notificações in-app
        await notificationService.notificarReuniaoAgendada(
          reuniaoCompleta.cliente_id,
          reuniaoCompleta.vendedor_id,
          reuniaoCompleta
        );

        // Enviar emails de confirmação será implementado via API separada
        // TODO: Implementar envio de email via API interna
        console.log('Reunião criada, emails serão enviados via job separado');
      } catch (notificationError) {
        console.error('Erro ao enviar notificações:', notificationError);
        // Não falhar a criação da reunião por erro de notificação
      }
    }

    return NextResponse.json({ data }, { status: 201 });
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
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da reunião é obrigatório' },
        { status: 400 }
      );
    }

    // Se está alterando data/horário, verificar conflitos
    if (updates.data || updates.hora_inicio || updates.hora_fim || updates.vendedor_id) {
      const { data: reuniaoAtual } = await supabase
        .from('reunioes')
        .select('vendedor_id, data, hora_inicio, hora_fim')
        .eq('id', id)
        .single();

      const vendedorId = updates.vendedor_id || reuniaoAtual?.vendedor_id;
      const data = updates.data || reuniaoAtual?.data;
      const horaInicio = updates.hora_inicio || reuniaoAtual?.hora_inicio;
      const horaFim = updates.hora_fim || reuniaoAtual?.hora_fim;

      // Verificar conflitos (excluindo a própria reunião)
      const { data: conflitos } = await supabase
        .from('reunioes')
        .select('id')
        .eq('vendedor_id', vendedorId)
        .eq('data', data)
        .neq('id', id)
        .neq('status', 'cancelada')
        .or(`and(hora_inicio.lte.${horaFim},hora_fim.gte.${horaInicio})`);

      if (conflitos && conflitos.length > 0) {
        return NextResponse.json(
          { error: 'Vendedor já possui reunião agendada neste horário' },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from('reunioes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar reunião:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar reunião' },
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
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID da reunião é obrigatório' },
        { status: 400 }
      );
    }

    // Não deletar fisicamente, apenas marcar como cancelada
    const { data, error } = await supabase
      .from('reunioes')
      .update({ 
        status: 'cancelada',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao cancelar reunião:', error);
      return NextResponse.json(
        { error: 'Erro ao cancelar reunião' },
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