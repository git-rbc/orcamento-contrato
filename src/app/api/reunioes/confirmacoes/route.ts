import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const reuniaoId = searchParams.get('reuniao_id');
    const vendedorId = searchParams.get('vendedor_id');
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const statusConfirmacao = searchParams.get('status'); // pendente, confirmado, cancelado

    // Se for busca por reunião específica
    if (reuniaoId) {
      const { data: confirmacoes, error } = await supabase
        .from('reunioes_confirmacoes')
        .select(`
          *,
          reunioes!inner(
            titulo,
            data,
            hora_inicio,
            cliente_id,
            clientes!inner(nome, email, telefone)
          ),
          users!enviado_por(nome, email)
        `)
        .eq('reuniao_id', reuniaoId)
        .order('data_envio', { ascending: false });

      if (error) {
        console.error('Erro ao buscar confirmações da reunião:', error);
        return NextResponse.json(
          { error: 'Erro ao buscar confirmações da reunião' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: confirmacoes });
    }

    // Busca geral de confirmações
    let query = supabase
      .from('reunioes_confirmacoes')
      .select(`
        *,
        reunioes!inner(
          id,
          titulo,
          data,
          hora_inicio,
          vendedor_id,
          cliente_id,
          clientes!inner(nome, email, telefone),
          users!vendedor_id(nome as vendedor_nome, email as vendedor_email)
        ),
        users!enviado_por(nome, email)
      `);

    if (vendedorId && vendedorId !== 'todos') {
      query = query.eq('reunioes.vendedor_id', vendedorId);
    }

    if (dataInicio) {
      query = query.gte('reunioes.data', dataInicio);
    }

    if (dataFim) {
      query = query.lte('reunioes.data', dataFim);
    }

    if (statusConfirmacao && statusConfirmacao !== 'todos') {
      query = query.eq('status', statusConfirmacao);
    }

    const { data: confirmacoes, error } = await query
      .order('data_envio', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Erro ao buscar confirmações:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar confirmações' },
        { status: 500 }
      );
    }

    // Estatísticas das confirmações
    const estatisticas = {
      total_confirmacoes: confirmacoes?.length || 0,
      por_status: confirmacoes?.reduce((acc: any, conf: any) => {
        acc[conf?.status] = (acc[conf?.status] || 0) + 1;
        return acc;
      }, {}) || {},
      por_canal: confirmacoes?.reduce((acc: any, conf: any) => {
        acc[conf?.canal] = (acc[conf?.canal] || 0) + 1;
        return acc;
      }, {}) || {},
      taxa_confirmacao: 0
    };

    const totalEnviadas = confirmacoes?.length || 0;
    const totalConfirmadas = confirmacoes?.filter((c: any) => c?.status === 'confirmado').length || 0;
    
    if (totalEnviadas > 0) {
      estatisticas.taxa_confirmacao = Math.round((totalConfirmadas / totalEnviadas) * 100);
    }

    const response = {
      confirmacoes: confirmacoes || [],
      estatisticas,
      filtros_aplicados: {
        reuniao_id: reuniaoId,
        vendedor_id: vendedorId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: statusConfirmacao
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
      reuniao_id, 
      canal, 
      numero_destinatario, 
      mensagem, 
      data_agendamento,
      tentativa_numero 
    } = body;

    // Validações básicas
    if (!reuniao_id || !canal || !numero_destinatario) {
      return NextResponse.json(
        { error: 'ID da reunião, canal e número do destinatário são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a reunião existe
    const { data: reuniao, error: reuniaoError } = await supabase
      .from('reunioes')
      .select('id, cliente_id, data, hora_inicio')
      .eq('id', reuniao_id)
      .single();

    if (reuniaoError || !reuniao) {
      return NextResponse.json(
        { error: 'Reunião não encontrada' },
        { status: 404 }
      );
    }

    // Determinar número da tentativa se não fornecido
    let numeroTentativa = tentativa_numero;
    if (!numeroTentativa) {
      const { data: ultimaConfirmacao } = await supabase
        .from('reunioes_confirmacoes')
        .select('tentativa_numero')
        .eq('reuniao_id', reuniao_id)
        .order('tentativa_numero', { ascending: false })
        .limit(1)
        .single();

      numeroTentativa = (ultimaConfirmacao?.tentativa_numero || 0) + 1;
    }

    // Criar confirmação
    const { data: novaConfirmacao, error: createError } = await supabase
      .from('reunioes_confirmacoes')
      .insert({
        reuniao_id,
        canal,
        numero_destinatario,
        mensagem: mensagem || gerarMensagemPadrao(reuniao, canal),
        status: data_agendamento ? 'agendado' : 'enviado',
        data_envio: data_agendamento || new Date().toISOString(),
        tentativa_numero: numeroTentativa,
        enviado_por: user.id
      })
      .select(`
        *,
        reunioes!inner(
          titulo,
          data,
          hora_inicio,
          cliente_id,
          clientes!inner(nome, email, telefone)
        ),
        users!enviado_por(nome, email)
      `)
      .single();

    if (createError) {
      console.error('Erro ao criar confirmação:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar confirmação' },
        { status: 500 }
      );
    }

    // Se não for agendamento, marcar como enviado imediatamente
    if (!data_agendamento) {
      // Aqui seria integrado com o serviço de envio real (WhatsApp, SMS, Email)
      // Por enquanto, apenas simular o envio
      console.log(`Confirmação enviada via ${canal} para ${numero_destinatario}`);
    }

    return NextResponse.json({ data: novaConfirmacao }, { status: 201 });
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
    
    const { id, status, resposta_cliente, data_resposta } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da confirmação é obrigatório' },
        { status: 400 }
      );
    }

    // Atualizar confirmação
    const updateData: any = {};
    if (status) updateData.status = status;
    if (resposta_cliente) updateData.resposta_cliente = resposta_cliente;
    if (data_resposta) updateData.data_resposta = data_resposta;
    
    updateData.updated_at = new Date().toISOString();

    const { data: confirmacaoAtualizada, error } = await supabase
      .from('reunioes_confirmacoes')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        reunioes!inner(
          titulo,
          data,
          hora_inicio,
          cliente_id,
          clientes!inner(nome, email, telefone)
        ),
        users!enviado_por(nome, email)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar confirmação:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar confirmação' },
        { status: 500 }
      );
    }

    // Se confirmação foi aceita, atualizar status da reunião
    if (status === 'confirmado') {
      await supabase
        .from('reunioes')
        .update({ 
          confirmada_cliente: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmacaoAtualizada.reuniao_id);
    }

    return NextResponse.json({ data: confirmacaoAtualizada });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função auxiliar para gerar mensagem padrão
function gerarMensagemPadrao(reuniao: any, canal: string): string {
  const data = new Date(reuniao.data).toLocaleDateString('pt-BR');
  const hora = reuniao.hora_inicio;

  if (canal === 'whatsapp') {
    return `Olá! Gostaria de confirmar sua reunião agendada para ${data} às ${hora}. Você pode confirmar sua presença? 📅`;
  } else if (canal === 'sms') {
    return `Confirme sua reunião: ${data} às ${hora}. Responda SIM para confirmar.`;
  } else if (canal === 'email') {
    return `Prezado(a), gostaria de confirmar sua reunião agendada para ${data} às ${hora}. Aguardo sua confirmação.`;
  } else {
    return `Reunião agendada para ${data} às ${hora}. Favor confirmar presença.`;
  }
}