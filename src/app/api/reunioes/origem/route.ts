import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const vendedorId = searchParams.get('vendedor_id');
    const agruparPor = searchParams.get('agrupar_por') || 'origem'; // origem, campanha, origem_campanha

    // Buscar reuniões com informações de origem e campanha dos clientes
    let query = supabase
      .from('v_reunioes_completa')
      .select(`
        id,
        status,
        local_atendimento,
        vendedor_id,
        vendedor_nome,
        cliente_id,
        cliente_nome,
        cliente_origem,
        cliente_campanha,
        data,
        hora_inicio
      `);

    if (dataInicio) {
      query = query.gte('data', dataInicio);
    }

    if (dataFim) {
      query = query.lte('data', dataFim);
    }

    if (vendedorId && vendedorId !== 'todos') {
      query = query.eq('vendedor_id', vendedorId);
    }

    const { data: reunioesData, error: reunioesError } = await query.order('data', { ascending: false });

    if (reunioesError) {
      console.error('Erro ao buscar reuniões por origem:', reunioesError);
      return NextResponse.json(
        { error: 'Erro ao buscar reuniões por origem' },
        { status: 500 }
      );
    }

    // Buscar resultados para calcular conversões
    let queryResultados = supabase
      .from('reunioes_resultados')
      .select(`
        reuniao_id,
        resultado,
        valor_estimado_negocio,
        reunioes!inner(
          cliente_id,
          clientes!inner(origem, campanha)
        )
      `);

    if (dataInicio) {
      queryResultados = queryResultados.gte('reunioes.data', dataInicio);
    }

    if (dataFim) {
      queryResultados = queryResultados.lte('reunioes.data', dataFim);
    }

    if (vendedorId && vendedorId !== 'todos') {
      queryResultados = queryResultados.eq('reunioes.vendedor_id', vendedorId);
    }

    const { data: resultadosData } = await queryResultados;

    // Agrupar dados baseado no tipo solicitado
    let agrupamento: any = {};

    if (agruparPor === 'origem') {
      // Agrupamento por origem
      agrupamento = reunioesData?.reduce((acc: any, reuniao: any) => {
        const origem = reuniao.cliente_origem || 'nao_informado';
        
        if (!acc[origem]) {
          acc[origem] = {
            origem,
            total_reunioes: 0,
            por_status: {},
            por_local: {},
            total_conversoes: 0,
            valor_total: 0,
            reunioes: []
          };
        }

        acc[origem].total_reunioes++;
        acc[origem].por_status[reuniao.status] = (acc[origem].por_status[reuniao.status] || 0) + 1;
        acc[origem].por_local[reuniao.local_atendimento] = (acc[origem].por_local[reuniao.local_atendimento] || 0) + 1;
        acc[origem].reunioes.push(reuniao);

        return acc;
      }, {}) || {};

    } else if (agruparPor === 'campanha') {
      // Agrupamento por campanha
      agrupamento = reunioesData?.reduce((acc: any, reuniao: any) => {
        const campanha = reuniao.cliente_campanha || 'nao_informado';
        
        if (!acc[campanha]) {
          acc[campanha] = {
            campanha,
            total_reunioes: 0,
            por_status: {},
            por_local: {},
            total_conversoes: 0,
            valor_total: 0,
            reunioes: []
          };
        }

        acc[campanha].total_reunioes++;
        acc[campanha].por_status[reuniao.status] = (acc[campanha].por_status[reuniao.status] || 0) + 1;
        acc[campanha].por_local[reuniao.local_atendimento] = (acc[campanha].por_local[reuniao.local_atendimento] || 0) + 1;
        acc[campanha].reunioes.push(reuniao);

        return acc;
      }, {}) || {};

    } else if (agruparPor === 'origem_campanha') {
      // Agrupamento combinado origem + campanha
      agrupamento = reunioesData?.reduce((acc: any, reuniao: any) => {
        const origem = reuniao.cliente_origem || 'nao_informado';
        const campanha = reuniao.cliente_campanha || 'nao_informado';
        const chave = `${origem}|${campanha}`;
        
        if (!acc[chave]) {
          acc[chave] = {
            origem,
            campanha,
            chave_combinada: chave,
            total_reunioes: 0,
            por_status: {},
            por_local: {},
            total_conversoes: 0,
            valor_total: 0,
            reunioes: []
          };
        }

        acc[chave].total_reunioes++;
        acc[chave].por_status[reuniao.status] = (acc[chave].por_status[reuniao.status] || 0) + 1;
        acc[chave].por_local[reuniao.local_atendimento] = (acc[chave].por_local[reuniao.local_atendimento] || 0) + 1;
        acc[chave].reunioes.push(reuniao);

        return acc;
      }, {}) || {};
    }

    // Adicionar dados de conversão aos agrupamentos
    resultadosData?.forEach((resultado: any) => {
      const reuniao = reunioesData?.find(r => r.id === resultado.reuniao_id);
      if (!reuniao) return;

      let chave: string;
      if (agruparPor === 'origem') {
        chave = reuniao.cliente_origem || 'nao_informado';
      } else if (agruparPor === 'campanha') {
        chave = reuniao.cliente_campanha || 'nao_informado';
      } else {
        const origem = reuniao.cliente_origem || 'nao_informado';
        const campanha = reuniao.cliente_campanha || 'nao_informado';
        chave = `${origem}|${campanha}`;
      }

      if (agrupamento[chave]) {
        if (['conversao', 'sucesso'].includes(resultado.resultado)) {
          agrupamento[chave].total_conversoes++;
        }
        if (resultado.valor_estimado_negocio) {
          agrupamento[chave].valor_total += parseFloat(resultado.valor_estimado_negocio);
        }
      }
    });

    // Calcular taxa de conversão para cada agrupamento
    Object.keys(agrupamento).forEach(chave => {
      const grupo = agrupamento[chave];
      grupo.taxa_conversao = grupo.total_reunioes > 0 
        ? Math.round((grupo.total_conversoes / grupo.total_reunioes) * 100) 
        : 0;
    });

    // Converter para array e ordenar por total de reuniões
    const resultado = Object.values(agrupamento)
      .sort((a: any, b: any) => b.total_reunioes - a.total_reunioes);

    // Estatísticas gerais
    const totalReunioes = reunioesData?.length || 0;
    const totalConversoes = resultadosData?.filter(r => ['conversao', 'sucesso'].includes(r.resultado)).length || 0;
    const taxaConversaoGeral = totalReunioes > 0 ? Math.round((totalConversoes / totalReunioes) * 100) : 0;
    const valorTotalGeral = resultadosData?.reduce((sum, r) => sum + (parseFloat(r.valor_estimado_negocio) || 0), 0) || 0;

    const response = {
      resumo: {
        total_reunioes: totalReunioes,
        total_conversoes: totalConversoes,
        taxa_conversao_geral: taxaConversaoGeral,
        valor_total_geral: valorTotalGeral,
        agrupado_por: agruparPor,
        total_agrupamentos: resultado.length
      },
      dados: resultado,
      filtros_aplicados: {
        vendedor_id: vendedorId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        agrupar_por: agruparPor
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