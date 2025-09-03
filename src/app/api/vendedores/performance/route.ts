import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const vendedorId = searchParams.get('vendedor_id');
    const periodoInicio = searchParams.get('periodo_inicio');
    const periodoFim = searchParams.get('periodo_fim');
    const incluirDetalhes = searchParams.get('incluir_detalhes') === 'true';

    // Se não especificar período, usar últimos 6 meses
    const dataFim = periodoFim || new Date().toISOString().split('T')[0].substring(0, 7);
    const dataInicio = periodoInicio || (() => {
      const data = new Date();
      data.setMonth(data.getMonth() - 6);
      return data.toISOString().split('T')[0].substring(0, 7);
    })();

    // Buscar performance histórica
    let queryPerformance = supabase
      .from('vendedores_performance')
      .select(`
        *,
        users!vendedor_id(id, nome, email)
      `)
      .gte('periodo', dataInicio)
      .lte('periodo', dataFim);

    if (vendedorId && vendedorId !== 'todos') {
      queryPerformance = queryPerformance.eq('vendedor_id', vendedorId);
    }

    const { data: performanceData, error: performanceError } = await queryPerformance
      .order('periodo', { ascending: true })
      .order('vendedor_id', { ascending: true });

    if (performanceError) {
      console.error('Erro ao buscar performance dos vendedores:', performanceError);
      return NextResponse.json(
        { error: 'Erro ao buscar performance dos vendedores' },
        { status: 500 }
      );
    }

    // Agrupar por vendedor
    const vendedoresPerformance: any = {};

    performanceData.forEach((item: any) => {
      const vendedorIdKey = item.vendedor_id;
      
      if (!vendedoresPerformance[vendedorIdKey]) {
        vendedoresPerformance[vendedorIdKey] = {
          vendedor_id: vendedorIdKey,
          vendedor_nome: item.users?.nome,
          vendedor_email: item.users?.email,
          historico_mensal: [],
          resumo: {
            total_reunioes: 0,
            total_contratos: 0,
            taxa_conversao_media: 0,
            melhor_mes: null,
            pior_mes: null,
            meses_ativos: 0,
            ranking_atual_geral: item.ranking_geral,
            ranking_atual_online: item.ranking_online,
            ranking_atual_presencial: item.ranking_presencial,
            ranking_atual_10_dias: item.ranking_10_dias,
            tendencia: 'estavel' // crescente, decrescente, estavel
          }
        };
      }

      const vendedor = vendedoresPerformance[vendedorIdKey];
      
      // Adicionar dados mensais
      vendedor.historico_mensal.push({
        periodo: item.periodo,
        total_reunioes: item.total_reunioes,
        total_contratos: item.total_contratos,
        taxa_conversao: item.taxa_conversao,
        ranking_geral: item.ranking_geral,
        ranking_online: item.ranking_online,
        ranking_presencial: item.ranking_presencial,
        ranking_10_dias: item.ranking_10_dias,
        created_at: item.created_at,
        updated_at: item.updated_at
      });

      // Atualizar resumo
      vendedor.resumo.total_reunioes += item.total_reunioes;
      vendedor.resumo.total_contratos += item.total_contratos;
      vendedor.resumo.meses_ativos++;
    });

    // Calcular métricas agregadas para cada vendedor
    Object.keys(vendedoresPerformance).forEach(vendedorIdKey => {
      const vendedor = vendedoresPerformance[vendedorIdKey];
      const historico = vendedor.historico_mensal;

      if (historico.length === 0) return;

      // Taxa de conversão média ponderada
      const taxaConversaoMedia = vendedor.resumo.total_reunioes > 0
        ? Math.round((vendedor.resumo.total_contratos / vendedor.resumo.total_reunioes) * 100)
        : 0;
      vendedor.resumo.taxa_conversao_media = taxaConversaoMedia;

      // Melhor e pior mês
      const melhorMes = historico.reduce((max, mes) => 
        mes.taxa_conversao > max.taxa_conversao ? mes : max
      );
      const piorMes = historico.reduce((min, mes) => 
        mes.taxa_conversao < min.taxa_conversao ? mes : min
      );

      vendedor.resumo.melhor_mes = {
        periodo: melhorMes.periodo,
        taxa_conversao: melhorMes.taxa_conversao,
        total_reunioes: melhorMes.total_reunioes,
        total_contratos: melhorMes.total_contratos
      };

      vendedor.resumo.pior_mes = {
        periodo: piorMes.periodo,
        taxa_conversao: piorMes.taxa_conversao,
        total_reunioes: piorMes.total_reunioes,
        total_contratos: piorMes.total_contratos
      };

      // Calcular tendência (últimos 3 meses vs 3 anteriores)
      if (historico.length >= 6) {
        const ultimosTresMeses = historico.slice(-3);
        const tresMesesAnteriores = historico.slice(-6, -3);

        const mediaUltimosTres = ultimosTresMeses.reduce((sum, mes) => sum + mes.taxa_conversao, 0) / 3;
        const mediaTresAnteriores = tresMesesAnteriores.reduce((sum, mes) => sum + mes.taxa_conversao, 0) / 3;

        if (mediaUltimosTres > mediaTresAnteriores * 1.05) {
          vendedor.resumo.tendencia = 'crescente';
        } else if (mediaUltimosTres < mediaTresAnteriores * 0.95) {
          vendedor.resumo.tendencia = 'decrescente';
        } else {
          vendedor.resumo.tendencia = 'estavel';
        }
      }
    });

    // Buscar dados detalhados se solicitado
    if (incluirDetalhes) {
      const vendedorIds = Object.keys(vendedoresPerformance);

      if (vendedorIds.length > 0) {
        // Buscar reuniões detalhadas do período
        let queryReunioes = supabase
          .from('v_reunioes_completa')
          .select(`
            id,
            vendedor_id,
            cliente_nome,
            status,
            local_atendimento,
            data,
            hora_inicio,
            cliente_origem,
            cliente_campanha
          `)
          .in('vendedor_id', vendedorIds)
          .gte('data', `${dataInicio}-01`)
          .lte('data', `${dataFim}-31`);

        const { data: reunioesDetalhes } = await queryReunioes;

        // Buscar resultados detalhados
        const { data: resultadosDetalhes } = await supabase
          .from('reunioes_resultados')
          .select(`
            reuniao_id,
            resultado,
            valor_estimado_negocio,
            data_follow_up,
            reunioes!inner(vendedor_id, data)
          `)
          .in('reunioes.vendedor_id', vendedorIds)
          .gte('reunioes.data', `${dataInicio}-01`)
          .lte('reunioes.data', `${dataFim}-31`);

        // Adicionar detalhes aos vendedores
        Object.keys(vendedoresPerformance).forEach(vendedorIdKey => {
          const vendedor = vendedoresPerformance[vendedorIdKey];
          
          // Reuniões do vendedor
          const reunioesVendedor = reunioesDetalhes?.filter(r => r.vendedor_id === vendedorIdKey) || [];
          
          // Resultados do vendedor
          const resultadosVendedor = resultadosDetalhes?.filter(r => (r as any).reunioes.vendedor_id === vendedorIdKey) || [];

          vendedor.detalhes = {
            reunioes_por_origem: reunioesVendedor.reduce((acc: any, r: any) => {
              const origem = r.cliente_origem || 'nao_informado';
              acc[origem] = (acc[origem] || 0) + 1;
              return acc;
            }, {}),
            reunioes_por_local: reunioesVendedor.reduce((acc: any, r: any) => {
              const local = r.local_atendimento || 'nao_definido';
              acc[local] = (acc[local] || 0) + 1;
              return acc;
            }, {}),
            resultados_por_tipo: resultadosVendedor.reduce((acc: any, r: any) => {
              acc[r.resultado] = (acc[r.resultado] || 0) + 1;
              return acc;
            }, {}),
            valor_total_negociado: resultadosVendedor.reduce((sum, r) => sum + (parseFloat(r.valor_estimado_negocio) || 0), 0),
            follow_ups_pendentes: resultadosVendedor.filter(r => r.data_follow_up && new Date(r.data_follow_up) >= new Date()).length
          };
        });
      }
    }

    // Converter para array e ordenar por performance geral
    const vendedoresArray = Object.values(vendedoresPerformance)
      .sort((a: any, b: any) => b.resumo.taxa_conversao_media - a.resumo.taxa_conversao_media);

    // Estatísticas gerais
    const estatisticasGerais = {
      total_vendedores: vendedoresArray.length,
      periodo: {
        inicio: dataInicio,
        fim: dataFim
      },
      totais: {
        reunioes: vendedoresArray.reduce((sum: number, v: any) => sum + v.resumo.total_reunioes, 0),
        contratos: vendedoresArray.reduce((sum: number, v: any) => sum + v.resumo.total_contratos, 0),
        taxa_conversao_geral: 0
      },
      tendencias: {
        crescente: vendedoresArray.filter((v: any) => v.resumo.tendencia === 'crescente').length,
        estavel: vendedoresArray.filter((v: any) => v.resumo.tendencia === 'estavel').length,
        decrescente: vendedoresArray.filter((v: any) => v.resumo.tendencia === 'decrescente').length
      }
    };

    // Calcular taxa de conversão geral
    if ((estatisticasGerais.totais.reunioes as number) > 0) {
      estatisticasGerais.totais.taxa_conversao_geral = Math.round(
        ((estatisticasGerais.totais.contratos as number) / (estatisticasGerais.totais.reunioes as number)) * 100
      );
    }

    const response = {
      vendedores: vendedoresArray,
      estatisticas_gerais: estatisticasGerais,
      filtros_aplicados: {
        vendedor_id: vendedorId,
        periodo_inicio: dataInicio,
        periodo_fim: dataFim,
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

// Endpoint para recalcular performance de um vendedor específico
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

    const { vendedor_id } = body;

    if (!vendedor_id) {
      return NextResponse.json(
        { error: 'ID do vendedor é obrigatório' },
        { status: 400 }
      );
    }

    // Chamar função do banco para recalcular performance
    const { data, error } = await supabase.rpc('calcular_performance_vendedor', {
      p_vendedor_id: vendedor_id
    });

    if (error) {
      console.error('Erro ao recalcular performance:', error);
      return NextResponse.json(
        { error: 'Erro ao recalcular performance do vendedor' },
        { status: 500 }
      );
    }

    // Atualizar rankings gerais
    const { error: rankingError } = await supabase.rpc('atualizar_rankings_performance');

    if (rankingError) {
      console.error('Erro ao atualizar rankings:', rankingError);
      // Não falhar a operação por erro de ranking
    }

    return NextResponse.json({ 
      data: { 
        success: true, 
        vendedor_id: vendedor_id,
        performance_recalculada: data 
      } 
    });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}