import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { LinhaItem } from '@/components/propostas/proposta-modal';
import { CondicoesPagamentoState } from '@/components/propostas/proposta-condicoes-pagamento';
import { gerarTokenPublico } from '@/lib/token-utils';

interface RolhaValues {
  vinho: string;
  destilado: string;
  energetico: string;
  chopp: string;
}

interface SalvarPropostaRequest {
  // Dados básicos
  codigoReuniao?: string;
  clienteId: string;
  dataContratacao?: string;
  dataRealizacao?: string;
  diaSemana?: string;
  espacoId?: string;
  layoutId?: string;
  numPessoas?: number;
  tipoEvento?: string;
  
  // Itens
  alimentacaoItens: LinhaItem[];
  bebidasItens: LinhaItem[];
  servicosItens: LinhaItem[];
  itensExtras: LinhaItem[];
  
  // Valores
  totalProposta: number;
  valorDesconto?: number;
  valorEntrada?: number;
  
  // Rolhas
  rolhas: RolhaValues;
  
  // Condições de pagamento
  condicoesPagamento: CondicoesPagamentoState;
}

// POST /api/propostas - Criar nova proposta
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body: SalvarPropostaRequest = await request.json();
    
    // Validações básicas
    if (!body.clienteId) {
      return NextResponse.json({ error: 'Cliente é obrigatório' }, { status: 400 });
    }
    
    if (!body.totalProposta || body.totalProposta <= 0) {
      return NextResponse.json({ error: 'Total da proposta deve ser maior que zero' }, { status: 400 });
    }

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

    // Gerar token público único
    let tokenPublico: string;
    let tokenUnico = false;
    let tentativas = 0;
    const maxTentativas = 5;

    do {
      tokenPublico = gerarTokenPublico();
      
      // Verificar se o token já existe
      const { data: existingProposta } = await supabase
        .from('propostas')
        .select('id')
        .eq('token_publico', tokenPublico)
        .single();
      
      tokenUnico = !existingProposta;
      tentativas++;
      
      if (tentativas >= maxTentativas) {
        return NextResponse.json({ error: 'Erro ao gerar token único' }, { status: 500 });
      }
    } while (!tokenUnico);

    // Preparar dados para inserção
    const propostaData = {
      codigo_reuniao: body.codigoReuniao || null,
      cliente_id: body.clienteId,
      data_contratacao: body.dataContratacao || null,
      data_realizacao: body.dataRealizacao || null,
      dia_semana: body.diaSemana || null,
      espaco_id: body.espacoId || null,
      layout_id: body.layoutId || null,
      num_pessoas: body.numPessoas || null,
      tipo_evento: body.tipoEvento || null,
      
      // Itens como JSON
      itens_alimentacao: body.alimentacaoItens || [],
      itens_bebidas: body.bebidasItens || [],
      itens_servicos: body.servicosItens || [],
      itens_extras: body.itensExtras || [],
      
      // Valores
      total_proposta: body.totalProposta,
      valor_desconto: body.valorDesconto || 0,
      valor_entrada: body.valorEntrada || 0,
      
      // Rolhas
      rolha_vinho: body.rolhas?.vinho || 'R$65,00',
      rolha_destilado: body.rolhas?.destilado || 'R$104,00',
      rolha_energetico: body.rolhas?.energetico || 'R$15,00',
      rolha_chopp: body.rolhas?.chopp || 'R$700,00',
      
      // Condições de pagamento
      modelo_pagamento: body.condicoesPagamento?.modeloPagamento || null,
      reajuste: body.condicoesPagamento?.reajuste || 'Não',
      juros: body.condicoesPagamento?.juros || 0,
      data_entrada: body.condicoesPagamento?.dataEntrada || null,
      forma_pagamento_entrada: body.condicoesPagamento?.formaPagamentoEntrada || null,
      status_pagamento_entrada: body.condicoesPagamento?.statusPagamentoEntrada || null,
      qtd_meses: body.condicoesPagamento?.qtdMeses || 1,
      dia_vencimento: body.condicoesPagamento?.diaVencimento || 5,
      forma_saldo_final: body.condicoesPagamento?.formaSaldoFinal || null,
      entrada: body.condicoesPagamento?.entrada || 'Não',
      negociacao: body.condicoesPagamento?.negociacao || null,
      clausulas_adicionais: body.condicoesPagamento?.clausulas || null,
      observacao_financeiro: body.condicoesPagamento?.observacao || null,
      
      // Token público para acesso externo
      token_publico: tokenPublico,
      
      // Metadados
      created_by: user.id,
      status: 'rascunho'
    };

    // Inserir proposta
    const { data: proposta, error } = await supabase
      .from('propostas')
      .insert(propostaData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir proposta:', error);
      return NextResponse.json({ error: 'Erro ao salvar proposta' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: proposta,
      message: 'Proposta salva com sucesso' 
    });

  } catch (error) {
    console.error('Erro na API de propostas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// GET /api/propostas - Listar propostas
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const clienteId = searchParams.get('cliente_id');
    
    // Filtros avançados
    const clienteNome = searchParams.get('cliente_nome');
    const codigoReuniao = searchParams.get('codigo_reuniao');
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const valorMin = searchParams.get('valor_min');
    const valorMax = searchParams.get('valor_max');
    const espacoId = searchParams.get('espaco_id');
    const vendedorId = searchParams.get('vendedor_id');
    const numPessoasMin = searchParams.get('num_pessoas_min');
    const numPessoasMax = searchParams.get('num_pessoas_max');

    // Buscar propostas com informações básicas
    let query = supabase
      .from('propostas')
      .select(`
        *,
        cliente:clientes(nome, email),
        espaco:espacos_eventos(nome),
        layout:espacos_eventos_layouts(layout)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filtros básicos
    if (status) {
      query = query.eq('status', status);
    }
    
    if (clienteId) {
      query = query.eq('cliente_id', clienteId);
    }

    // Filtros avançados
    if (codigoReuniao) {
      query = query.ilike('codigo_reuniao', `%${codigoReuniao}%`);
    }

    if (dataInicio) {
      query = query.gte('data_realizacao', dataInicio);
    }

    if (dataFim) {
      query = query.lte('data_realizacao', dataFim);
    }

    if (valorMin) {
      query = query.gte('total_proposta', parseFloat(valorMin));
    }

    if (valorMax) {
      query = query.lte('total_proposta', parseFloat(valorMax));
    }

    if (espacoId) {
      query = query.eq('espaco_id', espacoId);
    }

    if (vendedorId) {
      query = query.eq('created_by', vendedorId);
    }

    if (numPessoasMin) {
      query = query.gte('num_pessoas', parseInt(numPessoasMin));
    }

    if (numPessoasMax) {
      query = query.lte('num_pessoas', parseInt(numPessoasMax));
    }

    // Filtro por nome do cliente (precisa de join mais complexo)
    if (clienteNome) {
      // Primeiro buscar clientes que correspondem ao nome
      const { data: clientesCorrespondentes } = await supabase
        .from('clientes')
        .select('id')
        .ilike('nome', `%${clienteNome}%`);
      
      if (clientesCorrespondentes && clientesCorrespondentes.length > 0) {
        const clienteIds = clientesCorrespondentes.map(c => c.id);
        query = query.in('cliente_id', clienteIds);
      } else {
        // Se não encontrar clientes, retornar lista vazia
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0
          }
        });
      }
    }

    // Paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data: propostas, error, count } = await query
      .range(from, to);

    if (error) {
      console.error('Erro ao buscar propostas:', error);
      return NextResponse.json({ error: 'Erro ao buscar propostas' }, { status: 500 });
    }

    // Buscar dados dos vendedores para as propostas
    if (propostas && propostas.length > 0) {
      const vendedorIds = propostas
        .map(p => p.created_by)
        .filter(id => id) // Remove nulls
        .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicados

      if (vendedorIds.length > 0) {
        const { data: vendedores } = await supabase
          .from('users')
          .select(`
            id,
            nome,
            role_id,
            roles(id, nome)
          `)
          .in('id', vendedorIds);

        // Associar vendedores às propostas
        if (vendedores) {
          propostas.forEach(proposta => {
            if (proposta.created_by) {
              const vendedor = vendedores.find(v => v.id === proposta.created_by);
              if (vendedor) {
                proposta.vendedor = vendedor;
              }
            }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: propostas,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Erro na API de propostas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}