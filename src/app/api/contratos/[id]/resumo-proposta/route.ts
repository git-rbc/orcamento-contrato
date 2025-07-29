import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/contratos/[id]/resumo-proposta - Buscar resumo da proposta original do contrato
export async function GET(request: NextRequest, { params }: any) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar contrato
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', params.id)
      .single();

    if (contratoError || !contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Buscar proposta original baseada nos dados do contrato
    // Isso é uma busca aproximada já que não temos referência direta
    const { data: proposta, error: propostaError } = await supabase
      .from('propostas')
      .select('*')
      .eq('cliente_id', contrato.cliente_id)
      .eq('data_realizacao', contrato.data_evento)
      .eq('status', 'convertida')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (propostaError || !proposta) {
      return NextResponse.json({ 
        error: 'Proposta original não encontrada. Este contrato pode não ter sido gerado a partir de uma proposta.' 
      }, { status: 404 });
    }

    // Retornar dados da proposta formatados para o resumo
    const resumoData = {
      proposta: {
        id: proposta.id,
        itens_alimentacao: proposta.itens_alimentacao || [],
        itens_bebidas: proposta.itens_bebidas || [],
        itens_servicos: proposta.itens_servicos || [],
        itens_extras: proposta.itens_extras || [],
        rolha_vinho: proposta.rolha_vinho || 'ISENTA',
        rolha_destilado: proposta.rolha_destilado || 'ISENTA',
        rolha_energetico: proposta.rolha_energetico || 'ISENTA',
        rolha_chopp: proposta.rolha_chopp || 'ISENTA',
        total_proposta: proposta.total_proposta || 0,
        valor_desconto: proposta.valor_desconto || 0,
        valor_entrada: proposta.valor_entrada || 0,
        created_at: proposta.created_at
      },
      contrato: {
        id: contrato.id,
        numero_contrato: contrato.numero_contrato,
        cliente_id: contrato.cliente_id,
        data_evento: contrato.data_evento,
        local_evento: contrato.local_evento,
        numero_participantes: contrato.numero_participantes,
        valor_total: contrato.valor_total,
        status: contrato.status
      }
    };

    return NextResponse.json({ 
      success: true, 
      data: resumoData 
    });

  } catch (error) {
    console.error('Erro ao buscar resumo da proposta:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}