import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const espacoId = searchParams.get('espaco_id');
    const dataDesejada = searchParams.get('data_desejada');
    const status = searchParams.get('status'); // ativo, notificado, atendido, cancelado
    const ordenarPor = searchParams.get('ordenar_por') || 'prioridade'; // prioridade, data_solicitacao, pontuacao

    let query = supabase
      .from('fila_espera')
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
        usuarios!solicitado_por(
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
        )
      `);

    // Aplicar filtros
    if (espacoId && espacoId !== 'todos') {
      query = query.eq('espaco_id', espacoId);
    }

    if (dataDesejada) {
      query = query.eq('data_desejada', dataDesejada);
    }

    if (status && status !== 'todos') {
      query = query.eq('status', status);
    }

    // Ordenação
    if (ordenarPor === 'prioridade') {
      query = query.order('prioridade', { ascending: false })
                  .order('pontuacao', { ascending: false })
                  .order('created_at', { ascending: true });
    } else if (ordenarPor === 'pontuacao') {
      query = query.order('pontuacao', { ascending: false })
                  .order('prioridade', { ascending: false })
                  .order('created_at', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: true });
    }

    const { data: filaEspera, error } = await query;

    if (error) {
      console.error('Erro ao buscar fila de espera:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar fila de espera' },
        { status: 500 }
      );
    }

    // Calcular estatísticas da fila
    const estatisticas = {
      total_solicitacoes: filaEspera?.length || 0,
      por_status: filaEspera?.reduce((acc: any, item: any) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {}) || {},
      por_espaco: filaEspera?.reduce((acc: any, item: any) => {
        const espacoNome = item.espacos_eventos?.nome || 'Espaço Desconhecido';
        acc[espacoNome] = (acc[espacoNome] || 0) + 1;
        return acc;
      }, {}) || {},
      tempo_medio_espera: 0,
      maior_pontuacao: Math.max(...(filaEspera?.map(f => f.pontuacao) || [0])),
      valor_total_estimado: filaEspera?.reduce((sum, f) => sum + (f.valor_estimado_proposta || 0), 0) || 0
    };

    // Calcular tempo médio de espera para solicitações ativas
    const solicitacoesAtivas = filaEspera?.filter(f => f.status === 'ativo') || [];
    if (solicitacoesAtivas.length > 0) {
      const agora = new Date();
      const temposEspera = solicitacoesAtivas.map(f => {
        const criacao = new Date(f.created_at);
        return Math.floor((agora.getTime() - criacao.getTime()) / (1000 * 60 * 60)); // horas
      });
      estatisticas.tempo_medio_espera = Math.round(
        temposEspera.reduce((sum, t) => sum + t, 0) / temposEspera.length
      );
    }

    // Adicionar informações de posição na fila para cada item
    const filaComPosicao = filaEspera?.map((item, index) => ({
      ...item,
      posicao_fila: index + 1,
      tempo_espera_horas: Math.floor(
        (new Date().getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60)
      ),
      valor_estimado_formatado: item.valor_estimado_proposta 
        ? new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(item.valor_estimado_proposta)
        : null
    })) || [];

    const response = {
      fila_espera: filaComPosicao,
      estatisticas,
      filtros_aplicados: {
        espaco_id: espacoId,
        data_desejada: dataDesejada,
        status: status,
        ordenar_por: ordenarPor
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
      data_desejada,
      horario_preferencial,
      valor_estimado_proposta,
      observacoes,
      prioridade = 5 // padrão média
    } = body;

    // Validações básicas
    if (!cliente_id || !espaco_id || !data_desejada) {
      return NextResponse.json(
        { error: 'Cliente, espaço e data desejada são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se cliente existe
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id, nome, origem')
      .eq('id', cliente_id)
      .single();

    if (clienteError || !cliente) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se espaço existe
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

    // Verificar se cliente já está na fila para o mesmo espaço/data
    const { data: jaEmFila } = await supabase
      .from('fila_espera')
      .select('id')
      .eq('cliente_id', cliente_id)
      .eq('espaco_id', espaco_id)
      .eq('data_desejada', data_desejada)
      .eq('status', 'ativo')
      .single();

    if (jaEmFila) {
      return NextResponse.json(
        { error: 'Cliente já está na fila de espera para este espaço nesta data' },
        { status: 409 }
      );
    }

    // Calcular pontuação baseada em critérios
    const pontuacao = calcularPontuacao({
      valor_estimado: valor_estimado_proposta || 0,
      origem: cliente.origem,
      prioridade: prioridade,
      tempo_cliente: await calcularTempoCliente(supabase, cliente_id)
    });

    // Criar entrada na fila de espera
    const { data: novaEntrada, error: createError } = await supabase
      .from('fila_espera')
      .insert({
        cliente_id,
        espaco_id,
        data_desejada,
        horario_preferencial,
        valor_estimado_proposta: valor_estimado_proposta || 0,
        prioridade,
        pontuacao,
        observacoes,
        status: 'ativo',
        solicitado_por: user.id
      })
      .select(`
        *,
        clientes!cliente_id(nome, email, telefone, origem),
        usuarios!solicitado_por(nome, email),
        espacos_eventos!espaco_id(nome, capacidade, cidade)
      `)
      .single();

    if (createError) {
      console.error('Erro ao criar entrada na fila de espera:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar entrada na fila de espera' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: novaEntrada }, { status: 201 });
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
      acao, // notificar, atender, cancelar, atualizar_prioridade
      nova_prioridade,
      observacoes_atualizacao,
      data_notificacao,
      canal_notificacao,
      espaco_alternativo_id
    } = body;

    if (!id || !acao) {
      return NextResponse.json(
        { error: 'ID da entrada e ação são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se entrada existe
    const { data: entrada, error: entradaError } = await supabase
      .from('fila_espera')
      .select('*')
      .eq('id', id)
      .single();

    if (entradaError || !entrada) {
      return NextResponse.json(
        { error: 'Entrada na fila não encontrada' },
        { status: 404 }
      );
    }

    let updateData: any = {};

    if (acao === 'notificar') {
      updateData = {
        status: 'notificado',
        data_notificacao: data_notificacao || new Date().toISOString(),
        canal_notificacao: canal_notificacao || 'sistema',
        notificado: true,
        observacoes: entrada.observacoes ? 
          `${entrada.observacoes}\n\n[${new Date().toLocaleString('pt-BR')}] Cliente notificado via ${canal_notificacao || 'sistema'} por ${user.email}` :
          `Cliente notificado via ${canal_notificacao || 'sistema'} por ${user.email}`
      };

    } else if (acao === 'atender') {
      updateData = {
        status: 'atendido',
        data_atendimento: new Date().toISOString(),
        atendido_por: user.id,
        observacoes: entrada.observacoes ? 
          `${entrada.observacoes}\n\n[${new Date().toLocaleString('pt-BR')}] Cliente atendido por ${user.email}` :
          `Cliente atendido por ${user.email}`
      };

      // Se foi oferecido espaço alternativo
      if (espaco_alternativo_id) {
        updateData.espaco_alternativo_oferecido_id = espaco_alternativo_id;
        updateData.observacoes += ` - Espaço alternativo oferecido: ${espaco_alternativo_id}`;
      }

    } else if (acao === 'cancelar') {
      updateData = {
        status: 'cancelado',
        data_cancelamento: new Date().toISOString(),
        observacoes: entrada.observacoes ? 
          `${entrada.observacoes}\n\n[${new Date().toLocaleString('pt-BR')}] Cancelado por ${user.email}. ${observacoes_atualizacao || ''}` :
          `Cancelado por ${user.email}. ${observacoes_atualizacao || ''}`
      };

    } else if (acao === 'atualizar_prioridade') {
      if (!nova_prioridade || nova_prioridade < 1 || nova_prioridade > 10) {
        return NextResponse.json(
          { error: 'Nova prioridade deve estar entre 1 e 10' },
          { status: 400 }
        );
      }

      // Recalcular pontuação com nova prioridade
      const novaPontuacao = calcularPontuacao({
        valor_estimado: entrada.valor_estimado_proposta || 0,
        origem: 'existente', // Buscar do cliente se necessário
        prioridade: nova_prioridade,
        tempo_cliente: await calcularTempoCliente(supabase, entrada.cliente_id)
      });

      updateData = {
        prioridade: nova_prioridade,
        pontuacao: novaPontuacao,
        observacoes: entrada.observacoes ? 
          `${entrada.observacoes}\n\n[${new Date().toLocaleString('pt-BR')}] Prioridade alterada de ${entrada.prioridade} para ${nova_prioridade} por ${user.email}` :
          `Prioridade alterada de ${entrada.prioridade} para ${nova_prioridade} por ${user.email}`
      };

    } else {
      return NextResponse.json(
        { error: 'Ação inválida. Use: notificar, atender, cancelar ou atualizar_prioridade' },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    // Atualizar entrada
    const { data: entradaAtualizada, error: updateError } = await supabase
      .from('fila_espera')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        clientes!cliente_id(nome, email, telefone, origem),
        usuarios!solicitado_por(nome, email),
        espacos_eventos!espaco_id(nome, capacidade, cidade)
      `)
      .single();

    if (updateError) {
      console.error('Erro ao atualizar entrada na fila:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar entrada na fila' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: entradaAtualizada });
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
        { error: 'ID da entrada é obrigatório' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('fila_espera')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover entrada da fila:', error);
      return NextResponse.json(
        { error: 'Erro ao remover entrada da fila' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Entrada removida da fila com sucesso' 
    });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função para calcular pontuação baseada em critérios de negócio
function calcularPontuacao({ valor_estimado, origem, prioridade, tempo_cliente }: {
  valor_estimado: number;
  origem: string;
  prioridade: number;
  tempo_cliente: number;
}): number {
  let pontuacao = 0;

  // Pontuação por valor estimado (0-40 pontos)
  if (valor_estimado >= 50000) pontuacao += 40;
  else if (valor_estimado >= 20000) pontuacao += 30;
  else if (valor_estimado >= 10000) pontuacao += 20;
  else if (valor_estimado >= 5000) pontuacao += 10;

  // Pontuação por origem (0-20 pontos)
  const pontuacaoOrigem: { [key: string]: number } = {
    'indicacao': 20,
    'google': 15,
    'facebook': 10,
    'outro': 5
  };
  pontuacao += pontuacaoOrigem[origem] || 5;

  // Pontuação por prioridade (0-30 pontos)
  pontuacao += prioridade * 3;

  // Pontuação por tempo como cliente (0-10 pontos)
  if (tempo_cliente >= 365) pontuacao += 10; // 1+ anos
  else if (tempo_cliente >= 180) pontuacao += 7; // 6+ meses
  else if (tempo_cliente >= 90) pontuacao += 5; // 3+ meses
  else if (tempo_cliente >= 30) pontuacao += 3; // 1+ mês

  return Math.min(pontuacao, 100); // Max 100 pontos
}

// Função para calcular há quanto tempo é cliente (em dias)
async function calcularTempoCliente(supabase: any, clienteId: string): Promise<number> {
  try {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('created_at')
      .eq('id', clienteId)
      .single();

    if (cliente) {
      const criacao = new Date(cliente.created_at);
      const agora = new Date();
      return Math.floor((agora.getTime() - criacao.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return 0;
  } catch (error) {
    console.error('Erro ao calcular tempo como cliente:', error);
    return 0;
  }
}