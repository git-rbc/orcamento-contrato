import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const tipoRanking = searchParams.get('tipo') || 'geral'; // geral, online, presencial, 10_dias
    const periodo = searchParams.get('periodo') || new Date().toISOString().split('T')[0].substring(0, 7); // YYYY-MM
    const localAtendimento = searchParams.get('local_atendimento');
    const limite = parseInt(searchParams.get('limite') || '10');

    // Buscar performance dos vendedores
    let query = supabase
      .from('vendedores_performance')
      .select(`
        *,
        users!vendedor_id(id, nome, email)
      `)
      .eq('periodo', periodo);

    const { data: performanceData, error: performanceError } = await query;

    if (performanceError) {
      console.error('Erro ao buscar performance dos vendedores:', performanceError);
      return NextResponse.json(
        { error: 'Erro ao buscar ranking dos vendedores' },
        { status: 500 }
      );
    }

    // Filtrar e ordenar baseado no tipo de ranking solicitado
    let ranking: any[] = [];

    if (tipoRanking === 'geral') {
      ranking = performanceData
        .filter(p => p.ranking_geral > 0)
        .sort((a, b) => a.ranking_geral - b.ranking_geral);
    } else if (tipoRanking === 'online') {
      ranking = performanceData
        .filter(p => p.ranking_online > 0)
        .sort((a, b) => a.ranking_online - b.ranking_online);
    } else if (tipoRanking === 'presencial') {
      ranking = performanceData
        .filter(p => p.ranking_presencial > 0)
        .sort((a, b) => a.ranking_presencial - b.ranking_presencial);
    } else if (tipoRanking === '10_dias') {
      ranking = performanceData
        .filter(p => p.ranking_10_dias > 0)
        .sort((a, b) => a.ranking_10_dias - b.ranking_10_dias);
    }

    // Limitar resultados
    ranking = ranking.slice(0, limite);

    // Enriquecer com dados adicionais de reuniões do período
    const vendedorIds = ranking.map(r => r.vendedor_id);
    
    if (vendedorIds.length > 0) {
      // Calcular período para busca (últimos 30 dias para ranking de 10 dias)
      let dataInicioConsulta: string;
      let dataFimConsulta: string;

      if (tipoRanking === '10_dias') {
        const dataFim = new Date();
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 10);
        dataInicioConsulta = dataInicio.toISOString().split('T')[0];
        dataFimConsulta = dataFim.toISOString().split('T')[0];
      } else {
        // Para outros rankings, usar o mês do período
        dataInicioConsulta = `${periodo}-01`;
        const ultimoDiaMes = new Date(parseInt(periodo.split('-')[0]), parseInt(periodo.split('-')[1]), 0).getDate();
        dataFimConsulta = `${periodo}-${ultimoDiaMes.toString().padStart(2, '0')}`;
      }

      let queryReunioes = supabase
        .from('v_reunioes_completa')
        .select('vendedor_id, status, local_atendimento, data')
        .in('vendedor_id', vendedorIds)
        .gte('data', dataInicioConsulta)
        .lte('data', dataFimConsulta);

      if (localAtendimento && localAtendimento !== 'todos') {
        queryReunioes = queryReunioes.eq('local_atendimento', localAtendimento);
      }

      const { data: reunioesData } = await queryReunioes;

      // Buscar resultados de reuniões
      const { data: resultadosData } = await supabase
        .from('reunioes_resultados')
        .select(`
          resultado,
          valor_estimado_negocio,
          reunioes!inner(vendedor_id, data)
        `)
        .in('reunioes.vendedor_id', vendedorIds)
        .gte('reunioes.data', dataInicioConsulta)
        .lte('reunioes.data', dataFimConsulta);

      // Enriquecer ranking com dados detalhados
      ranking = ranking.map((item: any) => {
        const vendedorId = item.vendedor_id;
        
        // Reuniões do vendedor no período
        const reunioesVendedor = reunioesData?.filter(r => r.vendedor_id === vendedorId) || [];
        
        // Resultados do vendedor no período
        const resultadosVendedor = resultadosData?.filter(r => (r as any).reunioes.vendedor_id === vendedorId) || [];

        // Calcular estatísticas específicas
        const reunioesOnline = reunioesVendedor.filter(r => r.local_atendimento === 'online').length;
        const reunioesPresencial = reunioesVendedor.filter(r => r.local_atendimento !== 'online').length;
        
        const conversoes = resultadosVendedor.filter(r => ['conversao', 'sucesso'].includes(r.resultado)).length;
        const valorTotal = resultadosVendedor.reduce((sum, r) => sum + (parseFloat(r.valor_estimado_negocio) || 0), 0);

        const ticketMedio = conversoes > 0 ? valorTotal / conversoes : 0;

        return {
          ...item,
          vendedor_nome: item.users?.nome,
          vendedor_email: item.users?.email,
          posicao: ranking.indexOf(item) + 1,
          detalhes_periodo: {
            data_inicio: dataInicioConsulta,
            data_fim: dataFimConsulta,
            reunioes_online: reunioesOnline,
            reunioes_presencial: reunioesPresencial,
            total_conversoes: conversoes,
            valor_total: valorTotal,
            ticket_medio: Math.round(ticketMedio),
            taxa_conversao_periodo: reunioesVendedor.length > 0 
              ? Math.round((conversoes / reunioesVendedor.length) * 100)
              : 0
          }
        };
      });
    }

    // Estatísticas do ranking
    const estatisticas = {
      total_vendedores: ranking.length,
      periodo_consultado: periodo,
      tipo_ranking: tipoRanking,
      melhor_vendedor: ranking[0] || null,
      pior_vendedor: ranking[ranking.length - 1] || null,
      media_taxa_conversao: ranking.length > 0
        ? Math.round(ranking.reduce((sum, r) => sum + r.taxa_conversao, 0) / ranking.length)
        : 0,
      total_reunioes_periodo: ranking.reduce((sum, r) => sum + r.total_reunioes, 0),
      total_conversoes_periodo: ranking.reduce((sum, r) => sum + r.total_contratos, 0),
      valor_total_periodo: ranking.reduce((sum, r) => sum + (r.detalhes_periodo?.valor_total || 0), 0)
    };

    const response = {
      ranking,
      estatisticas,
      filtros_aplicados: {
        tipo: tipoRanking,
        periodo: periodo,
        local_atendimento: localAtendimento,
        limite: limite
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