import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    
    const dataInicio = searchParams.get('data_inicio') || new Date().toISOString().split('T')[0];
    const dataFim = searchParams.get('data_fim') || (() => {
      const data = new Date();
      data.setDate(data.getDate() + 30);
      return data.toISOString().split('T')[0];
    })();
    const vendedorId = searchParams.get('vendedor_id');
    const localAtendimento = searchParams.get('local');
    const status = searchParams.get('status');
    const tipoEvento = searchParams.get('tipo_evento');
    const cidade = searchParams.get('cidade');

    // Buscar eventos com join específico para vendedor
    let query = supabase
      .from('reunioes')
      .select(`
        id,
        cliente_id,
        vendedor_id,
        data,
        hora_inicio,
        hora_fim,
        titulo,
        status,
        local_atendimento,
        cidade,
        confirmada_cliente,
        confirmada_vendedor,
        lembrete_enviado,
        created_at,
        updated_at,
        users!reunioes_vendedor_id_fkey(nome, email)
      `)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (vendedorId && vendedorId !== 'todos') {
      query = query.eq('vendedor_id', vendedorId);
    }

    if (localAtendimento && localAtendimento !== 'todos') {
      query = query.eq('local_atendimento', localAtendimento);
    }

    if (status && status !== 'todos') {
      query = query.eq('status', status);
    }

    // Removido filtro por tipo_evento pois estamos buscando apenas reuniões
    // if (tipoEvento && tipoEvento !== 'todos') {
    //   query = query.eq('tipo_evento', tipoEvento);
    // }

    if (cidade && cidade !== 'todas') {
      query = query.eq('cidade', cidade);
    }

    const { data: eventosData, error: eventosError } = await query
      .order('data', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (eventosError) {
      console.error('Erro ao buscar eventos da agenda integrada:', eventosError);
      return NextResponse.json(
        { error: 'Erro ao buscar dados da agenda integrada' },
        { status: 500 }
      );
    }

    // Função helper para extrair cidade do título
    const extrairCidadeDoTitulo = (titulo: string): string => {
      const titulo_upper = titulo?.toUpperCase() || '';
      if (titulo_upper.includes('ITAPEMA')) return 'ITAPEMA';
      if (titulo_upper.includes('JOINVILLE')) return 'JOINVILLE';
      if (titulo_upper.includes('FLORIAN') || titulo_upper.includes('FLORIANÓPOLIS')) return 'FLORIANÓPOLIS';
      if (titulo_upper.includes('BLUMENAU')) return 'BLUMENAU';
      if (titulo_upper.includes('NOVA VENEZA')) return 'NOVA VENEZA';
      if (titulo_upper.includes('ATEND. PESSOAL') || titulo_upper.includes('REUN. SEMANAL')) return 'ATEND. PESSOAL / REUN. SEMANAL';
      if (titulo_upper.includes('TREINAMENTO')) return 'TREINAMENTO';
      return 'ONLINE';
    };

    // Transformar dados para o formato esperado com nomes dos vendedores
    const eventosTransformados = eventosData?.map(evento => {
      const cidadeExtraida = extrairCidadeDoTitulo(evento.titulo);
      const isOnline = evento.local_atendimento === 'online';
      
      return {
        id: evento.id,
        tipo_evento: 'reuniao', // Por enquanto só reuniões
        titulo: evento.titulo || 'Reunião',
        cliente_nome: 'Cliente', // Temporário - ainda sem join de cliente
        cliente_email: '',
        vendedor_nome: (evento.users as any)?.nome || 'Vendedor não informado',
        vendedor_id: evento.vendedor_id,
        data: evento.data,
        hora_inicio: evento.hora_inicio,
        hora_fim: evento.hora_fim,
        status: evento.status || 'agendada',
        local_atendimento: evento.local_atendimento || 'online',
        local_nome: isOnline ? 'ONLINE' : cidadeExtraida,
        cor_local: isOnline ? '#F97316' : '#22C55E', // Temporário, será calculado no frontend
        cidade: evento.cidade || cidadeExtraida,
        confirmada_cliente: evento.confirmada_cliente || false,
        confirmada_vendedor: evento.confirmada_vendedor || false,
        lembrete_enviado: evento.lembrete_enviado || false,
        precisa_confirmacao_cliente: !evento.confirmada_cliente,
        precisa_confirmacao_vendedor: !evento.confirmada_vendedor,
        horas_ate_expirar: null, // Apenas para reuniões agendadas
        pontuacao: null // Apenas para fila de espera
      };
    }) || [];

    // Se não há eventos, retornar resposta com dados vazios
    if (!eventosTransformados || eventosTransformados.length === 0) {
      return NextResponse.json({
        eventos: [],
        estatisticas: {
          total_reunioes: 0,
          total_reservas_temp: 0,
          total_fila_espera: 0,
          confirmacoes_pendentes: 0,
          reservas_expirando: 0,
          fila_alta_prioridade: 0,
          taxa_ocupacao: 0,
          por_status: {},
          por_local: {},
          por_vendedor: {}
        }
      });
    }

    // Calcular estatísticas
    const estatisticas = {
      total_reunioes: eventosTransformados.filter(e => e.tipo_evento === 'reuniao').length,
      total_reservas_temp: eventosTransformados.filter(e => e.tipo_evento === 'reserva_temporaria').length,
      total_fila_espera: eventosTransformados.filter(e => e.tipo_evento === 'fila_espera').length,
      
      confirmacoes_pendentes: eventosTransformados.filter(e => 
        e.tipo_evento === 'reuniao' && 
        (!e.confirmada_cliente || !e.confirmada_vendedor)
      ).length,
      
      reservas_expirando: eventosTransformados.filter(e => 
        e.tipo_evento === 'reserva_temporaria' &&
        e.horas_ate_expirar !== null &&
        e.horas_ate_expirar <= 24 &&
        e.horas_ate_expirar > 0
      ).length,
      
      fila_alta_prioridade: eventosTransformados.filter(e => 
        e.tipo_evento === 'fila_espera' &&
        e.pontuacao !== null &&
        e.pontuacao >= 70
      ).length,
      
      taxa_ocupacao: Math.round((eventosTransformados.length / 100) * 100), // Temporário
      
      por_status: eventosTransformados.reduce((acc: any, e: any) => {
        acc[e.status] = (acc[e.status] || 0) + 1;
        return acc;
      }, {}),
      
      por_local: eventosTransformados.reduce((acc: any, e: any) => {
        acc[e.local_atendimento] = (acc[e.local_atendimento] || 0) + 1;
        return acc;
      }, {}),
      
      por_vendedor: eventosTransformados.reduce((acc: any, e: any) => {
        acc[e.vendedor_nome] = (acc[e.vendedor_nome] || 0) + 1;
        return acc;
      }, {})
    };

    const response = {
      eventos: eventosTransformados,
      estatisticas
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro no servidor da agenda integrada:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const { acao, eventoId, tipoEvento, dados } = await request.json();

    switch (acao) {
      case 'confirmar':
        return await confirmarEvento(supabase, eventoId, tipoEvento, dados);
      
      case 'converter_reserva':
        return await converterReservaTempParaReuniao(supabase, eventoId);
      
      case 'mover_para_fila':
        return await moverParaFilaEspera(supabase, eventoId, dados);
      
      case 'enviar_lembrete':
        return await enviarLembrete(supabase, eventoId, tipoEvento);
      
      case 'enviar_lembretes_massa':
        return await enviarLembretesMassa(supabase);
      
      case 'cancelar_evento':
        return await cancelarEvento(supabase, eventoId, tipoEvento);
      
      case 'criar_reuniao':
        return await criarReuniao(supabase, dados);
      
      case 'criar_reserva':
        return await criarReservaTemporaria(supabase, dados);
      
      case 'criar_fila':
        return await criarFilaEspera(supabase, dados);
      
      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erro ao processar ação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Funções auxiliares para as ações
async function confirmarEvento(supabase: any, eventoId: string, tipoEvento: string, dados?: any) {
  try {
    if (tipoEvento === 'reuniao') {
      const updateData: any = {};
      
      if (dados?.confirmar_cliente) {
        updateData.confirmada_cliente = true;
      }
      
      if (dados?.confirmar_vendedor) {
        updateData.confirmada_vendedor = true;
      }
      
      // Se não especificado, confirmar ambos
      if (!dados?.confirmar_cliente && !dados?.confirmar_vendedor) {
        updateData.confirmada_cliente = true;
        updateData.confirmada_vendedor = true;
      }

      const { error } = await supabase
        .from('reunioes')
        .update(updateData)
        .eq('id', eventoId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Reunião confirmada' });
    }

    return NextResponse.json(
      { error: 'Tipo de evento não pode ser confirmado' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erro ao confirmar evento:', error);
    return NextResponse.json(
      { error: 'Erro ao confirmar evento' },
      { status: 500 }
    );
  }
}

async function converterReservaTempParaReuniao(supabase: any, reservaId: string) {
  try {
    // Buscar dados da reserva temporária
    const { data: reserva, error: reservaError } = await supabase
      .from('reservas_temporarias')
      .select('*')
      .eq('id', reservaId)
      .single();

    if (reservaError || !reserva) {
      return NextResponse.json(
        { error: 'Reserva temporária não encontrada' },
        { status: 404 }
      );
    }

    // Criar reunião baseada na reserva
    const novaReuniao = {
      cliente_id: reserva.cliente_id,
      vendedor_id: reserva.usuario_id,
      pre_vendedor_id: reserva.usuario_id,
      espaco_evento_id: reserva.espaco_evento_id,
      data: reserva.data_inicio,
      hora_inicio: reserva.hora_inicio || '09:00',
      hora_fim: reserva.hora_fim || '10:00',
      titulo: `Reunião - Cliente`,
      status: 'agendada',
      local_atendimento: 'presencial',
      tipo_origem: 'reserva_temporaria',
      reserva_temp_origem_id: reservaId,
      confirmada_cliente: false,
      confirmada_vendedor: false
    };

    const { data: reuniaoCriada, error: reuniaoError } = await supabase
      .from('reunioes')
      .insert([novaReuniao])
      .select()
      .single();

    if (reuniaoError) throw reuniaoError;

    // Atualizar reserva como convertida
    const { error: updateError } = await supabase
      .from('reservas_temporarias')
      .update({
        status: 'convertida',
        convertida_em_reuniao: true,
        reuniao_id: reuniaoCriada.id
      })
      .eq('id', reservaId);

    if (updateError) throw updateError;

    // Registrar conversão no histórico
    await supabase
      .from('agenda_conversoes_historico')
      .insert([{
        tipo_origem: 'reserva_temporaria',
        origem_id: reservaId,
        tipo_destino: 'reuniao',
        destino_id: reuniaoCriada.id,
        vendedor_id: reserva.usuario_id,
        cliente_id: reserva.cliente_id,
        motivo: 'Conversão automática via agenda integrada'
      }]);

    return NextResponse.json({
      success: true,
      message: 'Reserva convertida em reunião com sucesso',
      reuniao_id: reuniaoCriada.id
    });

  } catch (error) {
    console.error('Erro ao converter reserva:', error);
    return NextResponse.json(
      { error: 'Erro ao converter reserva em reunião' },
      { status: 500 }
    );
  }
}

async function moverParaFilaEspera(supabase: any, eventoId: string, dados: any) {
  try {
    // Implementar lógica para mover evento para fila de espera
    // Por agora, retornar sucesso simulado
    return NextResponse.json({
      success: true,
      message: 'Evento movido para fila de espera'
    });
  } catch (error) {
    console.error('Erro ao mover para fila:', error);
    return NextResponse.json(
      { error: 'Erro ao mover para fila de espera' },
      { status: 500 }
    );
  }
}

async function enviarLembrete(supabase: any, eventoId: string, tipoEvento: string) {
  try {
    // Marcar lembrete como enviado
    const tabela = tipoEvento === 'reuniao' ? 'reunioes' : 
                   tipoEvento === 'reserva_temporaria' ? 'reservas_temporarias' : 
                   'fila_espera';

    if (tabela === 'reunioes') {
      await supabase
        .from('reunioes')
        .update({ lembrete_enviado: true })
        .eq('id', eventoId);
    } else if (tabela === 'reservas_temporarias') {
      await supabase
        .from('reservas_temporarias')
        .update({ alertas_enviados: supabase.raw('COALESCE(alertas_enviados, 0) + 1') })
        .eq('id', eventoId);
    } else if (tabela === 'fila_espera') {
      await supabase
        .from('fila_espera')
        .update({ 
          notificado: true,
          ultima_notificacao: new Date().toISOString()
        })
        .eq('id', eventoId);
    }

    return NextResponse.json({
      success: true,
      message: 'Lembrete enviado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao enviar lembrete:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar lembrete' },
      { status: 500 }
    );
  }
}

async function enviarLembretesMassa(supabase: any) {
  try {
    // Atualizar todas as reuniões que precisam de confirmação
    const { error: reunioesError } = await supabase
      .from('reunioes')
      .update({ lembrete_enviado: true })
      .or('confirmada_cliente.eq.false,confirmada_vendedor.eq.false');

    // Atualizar reservas que vão expirar em breve
    const { error: reservasError } = await supabase
      .from('reservas_temporarias')
      .update({ alertas_enviados: supabase.raw('COALESCE(alertas_enviados, 0) + 1') })
      .eq('status', 'ativa')
      .lte('expira_em', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    return NextResponse.json({
      success: true,
      message: 'Lembretes enviados em massa'
    });
  } catch (error) {
    console.error('Erro ao enviar lembretes em massa:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar lembretes em massa' },
      { status: 500 }
    );
  }
}

async function cancelarEvento(supabase: any, eventoId: string, tipoEvento: string) {
  try {
    if (tipoEvento === 'reuniao') {
      const { error } = await supabase
        .from('reunioes')
        .update({ status: 'cancelada' })
        .eq('id', eventoId);

      if (error) throw error;
    } else if (tipoEvento === 'reserva_temporaria') {
      const { error } = await supabase
        .from('reservas_temporarias')
        .update({ status: 'liberada' })
        .eq('id', eventoId);

      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Evento cancelado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao cancelar evento:', error);
    return NextResponse.json(
      { error: 'Erro ao cancelar evento' },
      { status: 500 }
    );
  }
}

// Função auxiliar para calcular taxa de ocupação
function calcularTaxaOcupacao(eventos: any[], dataInicio: string, dataFim: string): number {
  // Calcular taxa baseada nos eventos confirmados vs slots disponíveis
  const eventosConfirmados = eventos.filter(e => 
    e.tipo_evento === 'reuniao' && 
    (e.status === 'confirmada' || e.status === 'agendada')
  ).length;

  // Calcular total de dias no período
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const totalDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

  // Assumir 8 slots por dia (horário comercial)
  const totalSlots = totalDias * 8;

  return totalSlots > 0 ? Math.round((eventosConfirmados / totalSlots) * 100) : 0;
}

// Novas funções para criação de eventos da grade
async function criarReuniao(supabase: any, dados: any) {
  try {
    // Buscar o ID do vendedor pelo nome ou usar o ID se já fornecido
    let vendedorId = dados.vendedor_id;
    if (!vendedorId && dados.vendedor_nome) {
      const { data: vendedor } = await supabase
        .from('users')
        .select('id')
        .eq('nome', dados.vendedor_nome)
        .single();
      vendedorId = vendedor?.id;
    }
    
    // Determinar local baseado no status_local
    const localNome = getLocalNomePorStatus(dados.status_local);
    
    const novaReuniao = {
      cliente_id: dados.cliente_id,
      cliente_nome: dados.cliente_nome,
      vendedor_id: vendedorId,
      pre_vendedor_id: vendedorId,
      titulo: `${localNome} - ${dados.cliente_nome}`,
      data: dados.data,
      hora_inicio: dados.hora_inicio,
      hora_fim: dados.hora_fim,
      local_atendimento: dados.local_atendimento,
      cidade: dados.cidade,
      status: 'agendada',
      confirmada_cliente: false,
      confirmada_vendedor: false,
      observacoes: dados.observacoes,
      telefone_cliente: dados.telefone,
      status_local_agenda: dados.status_local
    };

    const { data: reuniaoCriada, error } = await supabase
      .from('reunioes')
      .insert([novaReuniao])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Reunião criada com sucesso',
      data: reuniaoCriada
    });
  } catch (error) {
    console.error('Erro ao criar reunião:', error);
    return NextResponse.json(
      { error: 'Erro ao criar reunião' },
      { status: 500 }
    );
  }
}

async function criarReservaTemporaria(supabase: any, dados: any) {
  try {
    // Buscar o ID do vendedor pelo nome ou usar o ID se já fornecido
    let usuarioId = dados.vendedor_id;
    if (!usuarioId && dados.vendedor_nome) {
      const { data: vendedor } = await supabase
        .from('users')
        .select('id')
        .eq('name', dados.vendedor_nome)
        .single();
      usuarioId = vendedor?.id;
    }
    
    const novaReserva = {
      cliente_nome: dados.cliente_nome,
      usuario_id: usuarioId,
      data_inicio: dados.data,
      hora_inicio: dados.hora_inicio,
      hora_fim: dados.hora_fim,
      status: 'ativa',
      expira_em: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 horas
      observacoes: dados.observacoes,
      telefone_cliente: dados.telefone,
      status_local_agenda: dados.status_local
    };

    const { data: reservaCriada, error } = await supabase
      .from('reservas_temporarias')
      .insert([novaReserva])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Reserva temporária criada com sucesso',
      data: reservaCriada
    });
  } catch (error) {
    console.error('Erro ao criar reserva temporária:', error);
    return NextResponse.json(
      { error: 'Erro ao criar reserva temporária' },
      { status: 500 }
    );
  }
}

async function criarFilaEspera(supabase: any, dados: any) {
  try {
    // Buscar o ID do vendedor pelo nome ou usar o ID se já fornecido
    let usuarioId = dados.vendedor_id;
    if (!usuarioId && dados.vendedor_nome) {
      const { data: vendedor } = await supabase
        .from('users')
        .select('id')
        .eq('nome', dados.vendedor_nome)
        .single();
      usuarioId = vendedor?.id;
    }
    
    // Precisamos de um espaco_evento_id para a fila de espera
    // Por enquanto, vamos pegar o primeiro espaço disponível
    const { data: espacos } = await supabase
      .from('espacos_eventos')
      .select('id')
      .eq('ativo', true)
      .limit(1);

    const espacoEventoId = espacos?.[0]?.id || null;

    if (!espacoEventoId) {
      throw new Error('Nenhum espaço disponível encontrado para criar fila de espera');
    }

    const novaFila = {
      espaco_evento_id: espacoEventoId,
      cliente_id: dados.cliente_id,
      usuario_id: usuarioId,
      data_inicio: dados.data,
      data_fim: dados.data, // Mesma data por agora
      prioridade: await calcularProximaPrioridade(supabase),
      pontuacao: 50, // Pontuação padrão
      valor_estimado_proposta: null,
      notificado: false,
      convertida_em_reuniao: false,
      status_local_agenda: dados.status_local,
      telefone_cliente: dados.telefone,
      cidade: dados.cidade
    };

    const { data: filaCriada, error } = await supabase
      .from('fila_espera')
      .insert([novaFila])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Adicionado à fila de espera com sucesso',
      data: filaCriada
    });
  } catch (error) {
    console.error('Erro ao criar fila de espera:', error);
    return NextResponse.json(
      { error: 'Erro ao criar fila de espera' },
      { status: 500 }
    );
  }
}

async function calcularProximaPrioridade(supabase: any): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('fila_espera')
      .select('prioridade')
      .order('prioridade', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return (data?.prioridade || 0) + 1;
  } catch (error) {
    console.error('Erro ao calcular prioridade:', error);
    return 1;
  }
}

// Função helper para converter status em nome do local
function getLocalNomePorStatus(status: string): string {
  const mapeamento: Record<string, string> = {
    'online': 'ONLINE',
    'itapema': 'ITAPEMA',
    'joinville': 'JOINVILLE',
    'florianopolis': 'FLORIANÓPOLIS',
    'blumenau': 'BLUMENAU',
    'atend_pessoal': 'ATEND. PESSOAL / REUN. SEMANAL',
    'treinamento': 'TREINAMENTO',
    'nova_veneza': 'NOVA VENEZA'
  };
  
  return mapeamento[status] || 'ONLINE';
}