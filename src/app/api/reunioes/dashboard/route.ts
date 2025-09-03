import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const dataInicio = searchParams.get('data_inicio') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const dataFim = searchParams.get('data_fim') || new Date().toISOString().split('T')[0];
    const vendedorId = searchParams.get('vendedor_id');
    const localAtendimento = searchParams.get('local_atendimento');

    // Estatísticas gerais de reuniões
    let queryReunioesGeral = supabase
      .from('v_reunioes_completa')
      .select('status, local_atendimento, cliente_origem, cliente_campanha')
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (vendedorId && vendedorId !== 'todos') {
      queryReunioesGeral = queryReunioesGeral.eq('vendedor_id', vendedorId);
    }

    if (localAtendimento && localAtendimento !== 'todos') {
      queryReunioesGeral = queryReunioesGeral.eq('local_atendimento', localAtendimento);
    }

    const { data: reunioesData, error: reunioesError } = await queryReunioesGeral;

    if (reunioesError) {
      console.error('Erro ao buscar reuniões para dashboard:', reunioesError);
      return NextResponse.json(
        { error: 'Erro ao buscar estatísticas de reuniões' },
        { status: 500 }
      );
    }

    // Estatísticas por status
    const statusStats = reunioesData?.reduce((acc: any, reuniao: any) => {
      const status = reuniao.status || 'sem_status';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Estatísticas por local de atendimento
    const localStats = reunioesData?.reduce((acc: any, reuniao: any) => {
      const local = reuniao.local_atendimento || 'nao_definido';
      acc[local] = (acc[local] || 0) + 1;
      return acc;
    }, {}) || {};

    // Estatísticas por origem
    const origemStats = reunioesData?.reduce((acc: any, reuniao: any) => {
      const origem = reuniao.cliente_origem || 'nao_informado';
      acc[origem] = (acc[origem] || 0) + 1;
      return acc;
    }, {}) || {};

    // Estatísticas por campanha
    const campanhaStats = reunioesData?.reduce((acc: any, reuniao: any) => {
      const campanha = reuniao.cliente_campanha || 'nao_informado';
      acc[campanha] = (acc[campanha] || 0) + 1;
      return acc;
    }, {}) || {};

    // Buscar resultados de reuniões para métricas de conversão
    let queryResultados = supabase
      .from('reunioes_resultados')
      .select(`
        resultado,
        valor_estimado_negocio,
        reunioes!inner(data, vendedor_id, local_atendimento)
      `)
      .gte('reunioes.data', dataInicio)
      .lte('reunioes.data', dataFim);

    if (vendedorId && vendedorId !== 'todos') {
      queryResultados = queryResultados.eq('reunioes.vendedor_id', vendedorId);
    }

    if (localAtendimento && localAtendimento !== 'todos') {
      queryResultados = queryResultados.eq('reunioes.local_atendimento', localAtendimento);
    }

    const { data: resultadosData } = await queryResultados;

    // Estatísticas de conversão
    const resultadoStats = resultadosData?.reduce((acc: any, item: any) => {
      const resultado = item.resultado || 'sem_resultado';
      acc[resultado] = (acc[resultado] || 0) + 1;
      if (item.valor_estimado_negocio) {
        acc.valor_total = (acc.valor_total || 0) + parseFloat(item.valor_estimado_negocio);
      }
      return acc;
    }, {}) || {};

    // Reuniões por vendedor (top 10)
    let queryVendedores = supabase
      .from('v_reunioes_completa')
      .select('vendedor_id, vendedor_nome')
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (vendedorId && vendedorId !== 'todos') {
      queryVendedores = queryVendedores.eq('vendedor_id', vendedorId);
    }

    if (localAtendimento && localAtendimento !== 'todos') {
      queryVendedores = queryVendedores.eq('local_atendimento', localAtendimento);
    }

    const { data: vendedoresData } = await queryVendedores;

    const vendedorStats = vendedoresData?.reduce((acc: any, reuniao: any) => {
      const key = `${reuniao.vendedor_id}|${reuniao.vendedor_nome}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}) || {};

    // Transformar em array ordenado (top 10)
    const topVendedores = Object.entries(vendedorStats)
      .map(([key, count]) => {
        const [id, nome] = key.split('|');
        return { id, nome, total_reunioes: count };
      })
      .sort((a: any, b: any) => b.total_reunioes - a.total_reunioes)
      .slice(0, 10);

    // Reuniões por dia (últimos 30 dias para gráfico)
    const dataInicioGrafico = new Date();
    dataInicioGrafico.setDate(dataInicioGrafico.getDate() - 30);
    
    const { data: reunioesPorDia } = await supabase
      .from('reunioes')
      .select('data')
      .gte('data', dataInicioGrafico.toISOString().split('T')[0])
      .lte('data', dataFim);

    const reunioesDiarias = reunioesPorDia?.reduce((acc: any, reuniao: any) => {
      const data = reuniao.data;
      acc[data] = (acc[data] || 0) + 1;
      return acc;
    }, {}) || {};

    // Resumo geral
    const totalReunioes = reunioesData?.length || 0;
    const totalResultados = resultadosData?.length || 0;
    const taxaPreenchimentoResultado = totalReunioes > 0 ? Math.round((totalResultados / totalReunioes) * 100) : 0;

    const response = {
      resumo: {
        total_reunioes: totalReunioes,
        total_resultados: totalResultados,
        taxa_preenchimento_resultado: taxaPreenchimentoResultado,
        valor_total_estimado: resultadoStats.valor_total || 0,
        periodo: {
          inicio: dataInicio,
          fim: dataFim
        }
      },
      por_status: statusStats,
      por_local: localStats,
      por_origem: origemStats,
      por_campanha: campanhaStats,
      por_resultado: resultadoStats,
      top_vendedores: topVendedores,
      reunioes_por_dia: reunioesDiarias,
      filtros_aplicados: {
        vendedor_id: vendedorId,
        local_atendimento: localAtendimento,
        data_inicio: dataInicio,
        data_fim: dataFim
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