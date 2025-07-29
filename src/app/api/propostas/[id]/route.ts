import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { LinhaItem } from '@/components/propostas/proposta-modal';
import { CondicoesPagamentoState } from '@/components/propostas/proposta-condicoes-pagamento';

interface RolhaValues {
  vinho: string;
  destilado: string;
  energetico: string;
  chopp: string;
}

interface AtualizarPropostaRequest {
  // Dados básicos
  codigoReuniao?: string;
  clienteId?: string;
  dataContratacao?: string;
  dataRealizacao?: string;
  diaSemana?: string;
  espacoId?: string;
  layoutId?: string;
  numPessoas?: number;
  tipoEvento?: string;
  
  // Itens
  alimentacaoItens?: LinhaItem[];
  bebidasItens?: LinhaItem[];
  servicosItens?: LinhaItem[];
  itensExtras?: LinhaItem[];
  
  // Valores
  totalProposta?: number;
  valorDesconto?: number;
  valorEntrada?: number;
  
  // Rolhas
  rolhas?: RolhaValues;
  
  // Condições de pagamento
  condicoesPagamento?: CondicoesPagamentoState;
  
  // Status
  status?: string;
}

// GET /api/propostas/[id] - Buscar proposta específica
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('Usuário autenticado:', user.id, user.email);

    // Verificar dados do usuário e role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, nome, role, ativo')
      .eq('id', user.id)
      .single();

    console.log('Dados do usuário:', userData);

    const { id } = await params;
    console.log('Buscando proposta:', id);
    
    const { data: proposta, error } = await supabase
      .from('propostas')
      .select(`
        *,
        cliente:clientes(id, nome, email, telefone, cpf_cnpj),
        espaco:espacos_eventos(id, nome, capacidade_maxima),
        layout:espacos_eventos_layouts(id, layout)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar proposta:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ error: 'Proposta não encontrada', details: error.message }, { status: 404 });
    }

    // Se a proposta tem created_by, buscar dados do usuário criador
    let createdByUser = null;
    if (proposta?.created_by) {
      const { data: userCreator } = await supabase
        .from('users')
        .select('id, nome, email')
        .eq('id', proposta.created_by)
        .single();
      
      createdByUser = userCreator;
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...proposta,
        created_by_user: createdByUser
      }
    });

  } catch (error) {
    console.error('Erro na API de proposta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/propostas/[id] - Atualizar proposta
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se a proposta existe
    const { data: propostaExistente, error: propostaError } = await supabase
      .from('propostas')
      .select('id, status')
      .eq('id', id)
      .single();

    if (propostaError || !propostaExistente) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    // Verificar se pode editar (não pode editar se convertida)
    if (propostaExistente.status === 'convertida') {
      return NextResponse.json({ 
        error: 'Não é possível editar propostas que já foram convertidas em contratos' 
      }, { status: 400 });
    }

    const body: AtualizarPropostaRequest = await request.json();
    
    // Validar datas se fornecidas
    if (body.dataContratacao && body.dataRealizacao) {
      const dataContratacao = new Date(body.dataContratacao);
      const dataRealizacao = new Date(body.dataRealizacao);
      
      if (dataContratacao >= dataRealizacao) {
        return NextResponse.json({ 
          error: 'Data de contratação deve ser anterior à data de realização' 
        }, { status: 400 });
      }
    }

    // Validar capacidade se fornecida
    if (body.espacoId && body.numPessoas) {
      const { data: espaco } = await supabase
        .from('espacos_eventos')
        .select('capacidade_maxima')
        .eq('id', body.espacoId)
        .single();
      
      if (espaco && body.numPessoas > espaco.capacidade_maxima) {
        return NextResponse.json({ 
          error: `Número de pessoas (${body.numPessoas}) excede a capacidade máxima do espaço (${espaco.capacidade_maxima})` 
        }, { status: 400 });
      }
    }

    // Preparar dados para atualização (apenas campos fornecidos)
    const updateData: any = {};
    
    if (body.codigoReuniao !== undefined) updateData.codigo_reuniao = body.codigoReuniao;
    if (body.clienteId !== undefined) updateData.cliente_id = body.clienteId;
    if (body.dataContratacao !== undefined) updateData.data_contratacao = body.dataContratacao;
    if (body.dataRealizacao !== undefined) updateData.data_realizacao = body.dataRealizacao;
    if (body.diaSemana !== undefined) updateData.dia_semana = body.diaSemana;
    if (body.espacoId !== undefined) updateData.espaco_id = body.espacoId;
    if (body.layoutId !== undefined) updateData.layout_id = body.layoutId;
    if (body.numPessoas !== undefined) updateData.num_pessoas = body.numPessoas;
    if (body.tipoEvento !== undefined) updateData.tipo_evento = body.tipoEvento;
    
    // Itens
    if (body.alimentacaoItens !== undefined) updateData.itens_alimentacao = body.alimentacaoItens;
    if (body.bebidasItens !== undefined) updateData.itens_bebidas = body.bebidasItens;
    if (body.servicosItens !== undefined) updateData.itens_servicos = body.servicosItens;
    if (body.itensExtras !== undefined) updateData.itens_extras = body.itensExtras;
    
    // Valores
    if (body.totalProposta !== undefined) updateData.total_proposta = body.totalProposta;
    if (body.valorDesconto !== undefined) updateData.valor_desconto = body.valorDesconto;
    if (body.valorEntrada !== undefined) updateData.valor_entrada = body.valorEntrada;
    
    // Rolhas
    if (body.rolhas) {
      if (body.rolhas.vinho !== undefined) updateData.rolha_vinho = body.rolhas.vinho;
      if (body.rolhas.destilado !== undefined) updateData.rolha_destilado = body.rolhas.destilado;
      if (body.rolhas.energetico !== undefined) updateData.rolha_energetico = body.rolhas.energetico;
      if (body.rolhas.chopp !== undefined) updateData.rolha_chopp = body.rolhas.chopp;
    }
    
    // Condições de pagamento
    if (body.condicoesPagamento) {
      const cp = body.condicoesPagamento;
      if (cp.modeloPagamento !== undefined) updateData.modelo_pagamento = cp.modeloPagamento;
      if (cp.reajuste !== undefined) updateData.reajuste = cp.reajuste;
      if (cp.juros !== undefined) updateData.juros = cp.juros;
      if (cp.dataEntrada !== undefined) updateData.data_entrada = cp.dataEntrada;
      if (cp.formaPagamentoEntrada !== undefined) updateData.forma_pagamento_entrada = cp.formaPagamentoEntrada;
      if (cp.statusPagamentoEntrada !== undefined) updateData.status_pagamento_entrada = cp.statusPagamentoEntrada;
      if (cp.qtdMeses !== undefined) updateData.qtd_meses = cp.qtdMeses;
      if (cp.diaVencimento !== undefined) updateData.dia_vencimento = cp.diaVencimento;
      if (cp.formaSaldoFinal !== undefined) updateData.forma_saldo_final = cp.formaSaldoFinal;
      if (cp.entrada !== undefined) updateData.entrada = cp.entrada;
      if (cp.negociacao !== undefined) updateData.negociacao = cp.negociacao;
      if (cp.clausulas !== undefined) updateData.clausulas_adicionais = cp.clausulas;
      if (cp.observacao !== undefined) updateData.observacao_financeiro = cp.observacao;
    }
    
    // Status
    if (body.status !== undefined) {
      const statusValidos = ['rascunho', 'enviada', 'aceita', 'recusada', 'cancelada'];
      if (!statusValidos.includes(body.status)) {
        return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
      }
      updateData.status = body.status;
    }

    // Atualizar proposta
    const { data: proposta, error } = await supabase
      .from('propostas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar proposta:', error);
      return NextResponse.json({ error: 'Erro ao atualizar proposta' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: proposta,
      message: 'Proposta atualizada com sucesso' 
    });

  } catch (error) {
    console.error('Erro na API de proposta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/propostas/[id] - Deletar proposta
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se a proposta existe
    const { data: propostaExistente, error: propostaError } = await supabase
      .from('propostas')
      .select('id, status')
      .eq('id', id)
      .single();

    if (propostaError || !propostaExistente) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    // Verificar se pode deletar (não pode deletar se convertida)
    if (propostaExistente.status === 'convertida') {
      return NextResponse.json({ 
        error: 'Não é possível excluir propostas que já foram convertidas em contratos' 
      }, { status: 400 });
    }

    // Deletar proposta
    const { error } = await supabase
      .from('propostas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar proposta:', error);
      return NextResponse.json({ error: 'Erro ao deletar proposta' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Proposta deletada com sucesso' 
    });

  } catch (error) {
    console.error('Erro na API de proposta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}