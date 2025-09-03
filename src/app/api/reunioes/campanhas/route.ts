import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const vendedorId = searchParams.get('vendedor_id');
    const origem = searchParams.get('origem');
    const campanha = searchParams.get('campanha');
    const incluirDetalhes = searchParams.get('incluir_detalhes') === 'true';

    // Buscar performance por campanha
    let queryReunioes = supabase
      .from('v_reunioes_completa')
      .select(`
        id,
        cliente_campanha,
        cliente_origem,
        status,
        local_atendimento,
        vendedor_id,
        vendedor_nome,
        data,
        hora_inicio,
        cliente_nome,
        cliente_email
      `);

    if (dataInicio) {
      queryReunioes = queryReunioes.gte('data', dataInicio);
    }

    if (dataFim) {
      queryReunioes = queryReunioes.lte('data', dataFim);
    }

    if (vendedorId && vendedorId !== 'todos') {
      queryReunioes = queryReunioes.eq('vendedor_id', vendedorId);
    }

    if (origem && origem !== 'todos') {
      queryReunioes = queryReunioes.eq('cliente_origem', origem);
    }

    if (campanha && campanha !== 'todos') {
      queryReunioes = queryReunioes.eq('cliente_campanha', campanha);
    }

    const { data: reunioesData, error: reunioesError } = await queryReunioes.order('data', { ascending: false });

    if (reunioesError) {
      console.error('Erro ao buscar reuniões por campanha:', reunioesError);
      return NextResponse.json(
        { error: 'Erro ao buscar performance por campanha' },
        { status: 500 }
      );
    }

    // Buscar resultados das reuniões
    const reuniaoIds = reunioesData?.map(r => r.id) || [];
    let resultadosData: any[] = [];

    if (reuniaoIds.length > 0) {
      const { data: resultados } = await supabase
        .from('reunioes_resultados')
        .select('*')
        .in('reuniao_id', reuniaoIds);
      
      resultadosData = resultados || [];
    }

    // Agrupar por campanha
    const campanhaStats: any = {};

    reunioesData?.forEach(reuniao => {
      const campanhaNome = reuniao.cliente_campanha || 'sem_campanha';
      const origem = reuniao.cliente_origem || 'nao_informado';

      if (!campanhaStats[campanhaNome]) {
        campanhaStats[campanhaNome] = {
          campanha: campanhaNome,
          origem_principal: origem,
          total_reunioes: 0,
          reunioes_concluidas: 0,
          reunioes_canceladas: 0,
          total_conversoes: 0,
          valor_total_estimado: 0,
          por_status: {},
          por_local: {},
          por_vendedor: {},
          por_origem: {},
          reunioes_detalhes: incluirDetalhes ? [] : undefined,
          custo_por_lead: 0, // Pode ser calculado se tiver dados de investimento
          roi: 0
        };
      }

      const stats = campanhaStats[campanhaNome];
      stats.total_reunioes++;

      // Contar por status
      stats.por_status[reuniao.status] = (stats.por_status[reuniao.status] || 0) + 1;
      
      if (reuniao.status === 'concluida') {
        stats.reunioes_concluidas++;
      } else if (reuniao.status === 'cancelada') {
        stats.reunioes_canceladas++;
      }

      // Contar por local
      stats.por_local[reuniao.local_atendimento] = (stats.por_local[reuniao.local_atendimento] || 0) + 1;

      // Contar por vendedor
      stats.por_vendedor[reuniao.vendedor_nome] = (stats.por_vendedor[reuniao.vendedor_nome] || 0) + 1;

      // Contar por origem
      stats.por_origem[origem] = (stats.por_origem[origem] || 0) + 1;

      if (incluirDetalhes) {
        stats.reunioes_detalhes.push({
          id: reuniao.id,
          cliente_nome: reuniao.cliente_nome,
          cliente_email: reuniao.cliente_email,
          vendedor_nome: reuniao.vendedor_nome,
          data: reuniao.data,
          hora_inicio: reuniao.hora_inicio,
          status: reuniao.status,
          local_atendimento: reuniao.local_atendimento
        });
      }
    });

    // Adicionar dados de resultados
    resultadosData.forEach(resultado => {
      const reuniao = reunioesData?.find(r => r.id === resultado.reuniao_id);
      if (!reuniao) return;

      const campanhaNome = reuniao.cliente_campanha || 'sem_campanha';
      const stats = campanhaStats[campanhaNome];

      if (stats) {
        if (['conversao', 'sucesso'].includes(resultado.resultado)) {
          stats.total_conversoes++;
        }

        if (resultado.valor_estimado_negocio) {
          stats.valor_total_estimado += parseFloat(resultado.valor_estimado_negocio);
        }
      }
    });

    // Calcular métricas finais para cada campanha
    Object.keys(campanhaStats).forEach(campanhaNome => {
      const stats = campanhaStats[campanhaNome];
      
      // Taxa de conversão
      stats.taxa_conversao = stats.total_reunioes > 0 
        ? Math.round((stats.total_conversoes / stats.total_reunioes) * 100) 
        : 0;

      // Taxa de conclusão
      stats.taxa_conclusao = stats.total_reunioes > 0
        ? Math.round((stats.reunioes_concluidas / stats.total_reunioes) * 100)
        : 0;

      // Taxa de cancelamento
      stats.taxa_cancelamento = stats.total_reunioes > 0
        ? Math.round((stats.reunioes_canceladas / stats.total_reunioes) * 100)
        : 0;

      // Ticket médio
      stats.ticket_medio = stats.total_conversoes > 0
        ? Math.round(stats.valor_total_estimado / stats.total_conversoes)
        : 0;

      // Encontrar origem principal (mais comum)
      const origemMaisFrequente = Object.entries(stats.por_origem)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0];
      
      if (origemMaisFrequente) {
        stats.origem_principal = origemMaisFrequente[0];
      }
    });

    // Converter para array e ordenar
    const campanhasArray = Object.values(campanhaStats)
      .sort((a: any, b: any) => {
        // Ordenar por valor total estimado, depois por total de reuniões
        if (b.valor_total_estimado !== a.valor_total_estimado) {
          return b.valor_total_estimado - a.valor_total_estimado;
        }
        return b.total_reunioes - a.total_reunioes;
      });

    // Resumo geral
    const resumoGeral = {
      total_campanhas: campanhasArray.length,
      total_reunioes: reunioesData?.length || 0,
      total_conversoes: resultadosData.filter(r => ['conversao', 'sucesso'].includes(r.resultado)).length,
      valor_total_geral: resultadosData.reduce((sum, r) => sum + (parseFloat(r.valor_estimado_negocio) || 0), 0),
      campanha_mais_produtiva: (campanhasArray[0] as any)?.campanha || null,
      melhor_taxa_conversao: Math.max(...campanhasArray.map((c: any) => c.taxa_conversao), 0),
      taxa_conversao_geral: 0 // Will be calculated below
    };

    // Calcular taxa de conversão geral
    resumoGeral.taxa_conversao_geral = resumoGeral.total_reunioes > 0
      ? Math.round((resumoGeral.total_conversoes / resumoGeral.total_reunioes) * 100)
      : 0;

    const response = {
      resumo: resumoGeral,
      campanhas: campanhasArray,
      filtros_aplicados: {
        vendedor_id: vendedorId,
        origem: origem,
        campanha: campanha,
        data_inicio: dataInicio,
        data_fim: dataFim,
        incluir_detalhes: incluirDetalhes
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