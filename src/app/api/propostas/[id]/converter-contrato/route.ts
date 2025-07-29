import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { preencherTemplateComProposta } from '@/lib/proposta-to-contrato-utils';
import { gerarNumeroContrato } from '@/lib/contrato-utils';

// POST /api/propostas/[id]/converter-contrato - Converter proposta em contrato
export async function POST(request: NextRequest, { params }: any) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar proposta completa
    const { data: proposta, error: propostaError } = await supabase
      .from('propostas')
      .select(`
        *,
        cliente:clientes(nome),
        espaco:espacos_eventos(nome)
      `)
      .eq('id', params.id)
      .single();

    if (propostaError || !proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    // Verificar se proposta pode ser convertida
    if (proposta.status !== 'aceita') {
      return NextResponse.json({ 
        error: 'Apenas propostas aceitas podem ser convertidas em contratos' 
      }, { status: 400 });
    }

    // Verificar se já existe contrato para esta proposta
    const { data: contratoExistente } = await supabase
      .from('contratos')
      .select('id')
      .eq('cliente_id', proposta.cliente_id)
      .eq('data_evento', proposta.data_realizacao)
      .eq('valor_total', proposta.total_proposta)
      .single();

    if (contratoExistente) {
      return NextResponse.json({ 
        error: 'Já existe um contrato para esta proposta' 
      }, { status: 400 });
    }

    // Buscar dados do cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', proposta.cliente_id)
      .single();

    if (clienteError || !cliente) {
      return NextResponse.json({ 
        error: 'Cliente não encontrado' 
      }, { status: 404 });
    }

    // Carregar template completo
    let templateCompleto;
    try {
      const templateImport = await import('@/components/contratos/templates/modelo-eventos-completo.json');
      templateCompleto = templateImport.default;
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      return NextResponse.json({ 
        error: 'Erro ao carregar template do contrato' 
      }, { status: 500 });
    }

    // Gerar número do contrato
    const numeroContrato = gerarNumeroContrato(cliente.nome, cliente.id);

    // Buscar dados do vendedor/usuário
    const { data: vendedor } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', proposta.created_by)
      .single();

    const nomeVendedor = vendedor?.nome || 'Vendedor';

    // Preencher template com dados da proposta
    const conteudoPreenchido = preencherTemplateComProposta(
      templateCompleto.conteudo,
      proposta,
      cliente,
      nomeVendedor,
      numeroContrato
    );

    // Preparar dados do contrato
    const contratoData = {
      numero_contrato: numeroContrato,
      cliente_id: proposta.cliente_id,
      vendedor_id: proposta.created_by,
      tipo_evento: proposta.tipo_evento || 'Evento',
      data_evento: proposta.data_realizacao,
      local_evento: proposta.espaco?.nome || 'Local não especificado',
      numero_participantes: proposta.num_pessoas,
      valor_total: proposta.total_proposta,
      status: 'rascunho',
      observacoes: conteudoPreenchido // Salvar template preenchido nas observações
    };

    // Iniciar transação
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .insert(contratoData)
      .select()
      .single();

    if (contratoError) {
      console.error('Erro ao criar contrato:', contratoError);
      return NextResponse.json({ 
        error: 'Erro ao criar contrato: ' + contratoError.message 
      }, { status: 500 });
    }

    // Converter itens da proposta para contrato_servicos
    const todosItens = [
      ...proposta.itens_alimentacao,
      ...proposta.itens_bebidas,
      ...proposta.itens_servicos,
      ...proposta.itens_extras
    ];

    // ID do serviço genérico para produtos avulsos
    const SERVICO_PRODUTOS_AVULSOS_ID = 'e3f4d5c6-7a8b-9c0d-1e2f-3a4b5c6d7e8f';
    
    // Agrupar itens por servicoTemplateId para evitar duplicatas
    const servicosAgrupados = new Map();
    
    for (const item of todosItens) {
      if (item.valorUnitario > 0 && item.quantidade > 0) {
        // Se não tem servicoTemplateId, usar o serviço genérico
        const servicoId = item.servicoTemplateId || SERVICO_PRODUTOS_AVULSOS_ID;
        
        if (!servicoId) {
          console.warn('Item sem servicoTemplateId:', item);
          continue;
        }

        // Calcular valor total do item (com descontos)
        const valorBruto = item.valorUnitario * item.quantidade;
        const descontoNormal = valorBruto * (item.descontoAplicado || 0) / 100;
        let descontoCupom = 0;
        
        if (item.cupomAplicado) {
          if (item.cupomAplicado.tipo_desconto === 'percentual') {
            descontoCupom = (valorBruto - descontoNormal) * (item.cupomAplicado.valor_desconto / 100);
          } else {
            descontoCupom = Math.min(item.cupomAplicado.valor_desconto, valorBruto - descontoNormal);
          }
        }
        
        const valorTotal = valorBruto - descontoNormal - descontoCupom;

        // Agrupar por servicoTemplateId
        if (servicosAgrupados.has(servicoId)) {
          const grupo = servicosAgrupados.get(servicoId);
          grupo.quantidade += item.quantidade;
          grupo.valor_total += valorTotal;
          grupo.itens.push(item.descricao || item.nome || '');
        } else {
          servicosAgrupados.set(servicoId, {
            servico_id: servicoId,
            quantidade: item.quantidade,
            valor_unitario: item.valorUnitario,
            valor_total: valorTotal,
            itens: [item.descricao || item.nome || '']
          });
        }
      }
    }

    // Converter Map para array de serviços do contrato
    const servicosContrato = [];
    for (const [servicoId, grupo] of servicosAgrupados) {
      // Calcular valor unitário médio baseado no valor total e quantidade
      const valorUnitarioMedio = grupo.valor_total / grupo.quantidade;
      
      servicosContrato.push({
        contrato_id: contrato.id,
        servico_id: servicoId,
        quantidade: grupo.quantidade,
        valor_unitario: valorUnitarioMedio,
        valor_total: grupo.valor_total,
        observacoes: grupo.itens.filter(Boolean).join(', ') || null
      });
    }

    // Inserir serviços do contrato
    if (servicosContrato.length > 0) {
      const { error: servicosError } = await supabase
        .from('contrato_servicos')
        .insert(servicosContrato);

      if (servicosError) {
        console.error('Erro ao inserir serviços do contrato:', servicosError);
        // Rollback: deletar contrato criado
        await supabase.from('contratos').delete().eq('id', contrato.id);
        return NextResponse.json({ 
          error: 'Erro ao criar serviços do contrato: ' + servicosError.message 
        }, { status: 500 });
      }
    }

    // Atualizar status da proposta para 'convertida'
    const { error: updateError } = await supabase
      .from('propostas')
      .update({ status: 'convertida' })
      .eq('id', params.id);

    if (updateError) {
      console.warn('Erro ao atualizar status da proposta:', updateError);
      // Não falhamos aqui pois o contrato já foi criado
    }

    // Buscar contrato completo para retornar
    const { data: contratoCompleto, error: fetchError } = await supabase
      .from('contratos')
      .select(`
        *,
        cliente:clientes(nome, email),
        servicos:contrato_servicos(*)
      `)
      .eq('id', contrato.id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar contrato completo:', fetchError);
      return NextResponse.json({ 
        success: true, 
        data: contrato,
        message: 'Contrato criado com sucesso' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: contratoCompleto,
      message: 'Proposta convertida em contrato com sucesso',
      contrato_id: contrato.id,
      numero_contrato: contrato.numero_contrato
    });

  } catch (error) {
    console.error('Erro ao converter proposta em contrato:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}