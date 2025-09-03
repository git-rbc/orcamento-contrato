import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status'); // ativa, expirada, convertida, liberada
    const vendedorId = searchParams.get('vendedor_id');
    const clienteId = searchParams.get('cliente_id');
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const incluirExpiradas = searchParams.get('incluir_expiradas') === 'true';

    let query = supabase
      .from('reservas_temporarias')
      .select(`
        *,
        clientes!cliente_id(
          id,
          nome,
          email,
          telefone,
          origem,
          campanha
        ),
        users!vendedor_id(
          id,
          nome,
          email
        ),
        espacos_eventos!espaco_id(
          id,
          nome,
          capacidade,
          cidade,
          endereco
        ),
        contratos!convertida_em_proposta_id(
          id,
          numero_contrato,
          valor_total,
          status
        )
      `);

    // Aplicar filtros
    if (status && status !== 'todos') {
      query = query.eq('status', status);
    }

    if (vendedorId && vendedorId !== 'todos') {
      query = query.eq('vendedor_id', vendedorId);
    }

    if (clienteId && clienteId !== 'todos') {
      query = query.eq('cliente_id', clienteId);
    }

    if (dataInicio) {
      query = query.gte('data_inicio', dataInicio);
    }

    if (dataFim) {
      query = query.lte('data_inicio', dataFim);
    }

    // Se não incluir expiradas, filtrar apenas ativas
    if (!incluirExpiradas) {
      query = query.neq('status', 'expirada');
    }

    const { data: reservas, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar reservas temporárias:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar reservas temporárias' },
        { status: 500 }
      );
    }

    // Calcular tempo restante para reservas ativas
    const reservasComTempo = reservas?.map(reserva => {
      let tempoRestante = null;
      let expiradaAgora = false;

      if (reserva.status === 'ativa') {
        const agora = new Date();
        const expiraEm = new Date(reserva.expira_em);
        const diffMs = expiraEm.getTime() - agora.getTime();
        
        if (diffMs > 0) {
          tempoRestante = {
            total_ms: diffMs,
            horas: Math.floor(diffMs / (1000 * 60 * 60)),
            minutos: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
            segundos: Math.floor((diffMs % (1000 * 60)) / 1000)
          };
        } else {
          expiradaAgora = true;
        }
      }

      return {
        ...reserva,
        tempo_restante: tempoRestante,
        expirou_agora: expiradaAgora,
        valor_estimado_formatado: reserva.valor_estimado_proposta 
          ? new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL' 
            }).format(reserva.valor_estimado_proposta)
          : null
      };
    }) || [];

    // Estatísticas das reservas
    const estatisticas = {
      total_reservas: reservas?.length || 0,
      por_status: reservas?.reduce((acc: any, reserva: any) => {
        acc[reserva.status] = (acc[reserva.status] || 0) + 1;
        return acc;
      }, {}) || {},
      valor_total_estimado: reservas?.reduce((sum, r) => sum + (r.valor_estimado_proposta || 0), 0) || 0,
      reservas_expirando_24h: reservasComTempo.filter(r => 
        r.tempo_restante && r.tempo_restante.total_ms <= 24 * 60 * 60 * 1000
      ).length,
      taxa_conversao: 0
    };

    // Calcular taxa de conversão
    const totalReservas = reservas?.length || 0;
    const reservasConvertidas = reservas?.filter(r => r.status === 'convertida').length || 0;
    
    if (totalReservas > 0) {
      estatisticas.taxa_conversao = Math.round((reservasConvertidas / totalReservas) * 100);
    }

    const response = {
      reservas: reservasComTempo,
      estatisticas,
      filtros_aplicados: {
        status: status,
        vendedor_id: vendedorId,
        cliente_id: clienteId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        incluir_expiradas: incluirExpiradas
      }
    };

    return NextResponse.json({ data: response });
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

    const { 
      cliente_id, 
      espaco_id, 
      data_inicio, 
      data_fim, 
      hora_inicio, 
      hora_fim, 
      valor_estimado_proposta,
      observacoes,
      prazo_horas = 48 // padrão 48h
    } = body;

    // Validações básicas
    if (!cliente_id || !espaco_id || !data_inicio || !hora_inicio || !hora_fim) {
      return NextResponse.json(
        { error: 'Cliente, espaço, data e horários são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se cliente existe
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('id', cliente_id)
      .single();

    if (clienteError || !cliente) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se espaço existe e está ativo
    const { data: espaco, error: espacoError } = await supabase
      .from('espacos_eventos')
      .select('id, nome, ativo')
      .eq('id', espaco_id)
      .single();

    if (espacoError || !espaco) {
      return NextResponse.json(
        { error: 'Espaço não encontrado' },
        { status: 404 }
      );
    }

    if (!espaco.ativo) {
      return NextResponse.json(
        { error: 'Espaço não está ativo' },
        { status: 400 }
      );
    }

    // Verificar se já existe reserva ativa do cliente para o mesmo período
    const { data: reservaExistente } = await supabase
      .from('reservas_temporarias')
      .select('id')
      .eq('cliente_id', cliente_id)
      .eq('espaco_id', espaco_id)
      .eq('data_inicio', data_inicio)
      .eq('status', 'ativa')
      .single();

    if (reservaExistente) {
      return NextResponse.json(
        { error: 'Cliente já possui reserva ativa para este espaço nesta data' },
        { status: 409 }
      );
    }

    // Calcular data de expiração
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + prazo_horas);

    // Criar reserva temporária
    const { data: novaReserva, error: createError } = await supabase
      .from('reservas_temporarias')
      .insert({
        cliente_id,
        vendedor_id: user.id,
        espaco_id,
        data_inicio,
        data_fim: data_fim || data_inicio,
        hora_inicio,
        hora_fim,
        valor_estimado_proposta: valor_estimado_proposta || 0,
        observacoes,
        expira_em: expiraEm.toISOString(),
        status: 'ativa'
      })
      .select(`
        *,
        clientes!cliente_id(nome, email, telefone),
        users!vendedor_id(nome, email),
        espacos_eventos!espaco_id(nome, capacidade, cidade)
      `)
      .single();

    if (createError) {
      console.error('Erro ao criar reserva temporária:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar reserva temporária' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: novaReserva }, { status: 201 });
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
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const { 
      id, 
      acao, // estender, converter, liberar, cancelar
      horas_adicao, 
      proposta_id,
      motivo 
    } = body;

    if (!id || !acao) {
      return NextResponse.json(
        { error: 'ID da reserva e ação são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se reserva existe
    const { data: reserva, error: reservaError } = await supabase
      .from('reservas_temporarias')
      .select('*')
      .eq('id', id)
      .single();

    if (reservaError || !reserva) {
      return NextResponse.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      );
    }

    let updateData: any = {};

    if (acao === 'estender') {
      if (!horas_adicao || horas_adicao <= 0) {
        return NextResponse.json(
          { error: 'Número de horas para extensão é obrigatório e deve ser positivo' },
          { status: 400 }
        );
      }

      if (reserva.status !== 'ativa') {
        return NextResponse.json(
          { error: 'Apenas reservas ativas podem ser estendidas' },
          { status: 400 }
        );
      }

      const novaExpiracao = new Date(reserva.expira_em);
      novaExpiracao.setHours(novaExpiracao.getHours() + horas_adicao);

      updateData = {
        expira_em: novaExpiracao.toISOString(),
        observacoes: reserva.observacoes ? 
          `${reserva.observacoes}\n\n[${new Date().toLocaleString('pt-BR')}] Prazo estendido em ${horas_adicao}h por ${user.email}` :
          `Prazo estendido em ${horas_adicao}h por ${user.email}`
      };

    } else if (acao === 'converter') {
      if (!proposta_id) {
        return NextResponse.json(
          { error: 'ID da proposta é obrigatório para conversão' },
          { status: 400 }
        );
      }

      if (reserva.status !== 'ativa') {
        return NextResponse.json(
          { error: 'Apenas reservas ativas podem ser convertidas' },
          { status: 400 }
        );
      }

      updateData = {
        status: 'convertida',
        convertida_em_proposta_id: proposta_id,
        data_conversao: new Date().toISOString(),
        observacoes: reserva.observacoes ? 
          `${reserva.observacoes}\n\n[${new Date().toLocaleString('pt-BR')}] Convertida em proposta ${proposta_id} por ${user.email}` :
          `Convertida em proposta ${proposta_id} por ${user.email}`
      };

    } else if (acao === 'liberar') {
      updateData = {
        status: 'liberada',
        data_liberacao: new Date().toISOString(),
        observacoes: reserva.observacoes ? 
          `${reserva.observacoes}\n\n[${new Date().toLocaleString('pt-BR')}] Liberada por ${user.email}. Motivo: ${motivo || 'Não informado'}` :
          `Liberada por ${user.email}. Motivo: ${motivo || 'Não informado'}`
      };

    } else if (acao === 'cancelar') {
      updateData = {
        status: 'cancelada',
        data_cancelamento: new Date().toISOString(),
        observacoes: reserva.observacoes ? 
          `${reserva.observacoes}\n\n[${new Date().toLocaleString('pt-BR')}] Cancelada por ${user.email}. Motivo: ${motivo || 'Não informado'}` :
          `Cancelada por ${user.email}. Motivo: ${motivo || 'Não informado'}`
      };

    } else {
      return NextResponse.json(
        { error: 'Ação inválida. Use: estender, converter, liberar ou cancelar' },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    // Atualizar reserva
    const { data: reservaAtualizada, error: updateError } = await supabase
      .from('reservas_temporarias')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        clientes!cliente_id(nome, email, telefone),
        users!vendedor_id(nome, email),
        espacos_eventos!espaco_id(nome, capacidade, cidade),
        contratos!convertida_em_proposta_id(numero_contrato, valor_total, status)
      `)
      .single();

    if (updateError) {
      console.error('Erro ao atualizar reserva:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar reserva' },
        { status: 500 }
      );
    }

    // Se a reserva foi liberada, notificar fila de espera
    if (acao === 'liberar') {
      // TODO: Implementar notificação da fila de espera
      console.log(`Reserva ${id} liberada - verificar fila de espera para ${reserva.espaco_id} em ${reserva.data_inicio}`);
    }

    return NextResponse.json({ data: reservaAtualizada });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}