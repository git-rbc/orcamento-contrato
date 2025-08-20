import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const vendedorId = searchParams.get('vendedor_id');

    // Estatísticas gerais
    let statsQuery = supabase
      .from('reunioes')
      .select('status');

    if (dataInicio) {
      statsQuery = statsQuery.gte('data', dataInicio);
    }

    if (dataFim) {
      statsQuery = statsQuery.lte('data', dataFim);
    }

    if (vendedorId && vendedorId !== 'todos') {
      statsQuery = statsQuery.eq('vendedor_id', vendedorId);
    }

    const { data: reunioes, error: statsError } = await statsQuery;

    if (statsError) {
      console.error('Erro ao buscar estatísticas:', statsError);
      return NextResponse.json(
        { error: 'Erro ao buscar estatísticas' },
        { status: 500 }
      );
    }

    // Contar por status
    const estatisticas = reunioes?.reduce((acc: any, reuniao: any) => {
      const status = reuniao.status || 'agendada';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}) || {};

    const total = reunioes?.length || 0;

    // Dashboard por vendedor
    let dashboardQuery = supabase
      .from('v_dashboard_reunioes')
      .select('*');

    if (dataInicio && dataFim) {
      const mesInicio = new Date(dataInicio).toISOString().substring(0, 7) + '-01';
      const mesFim = new Date(dataFim).toISOString().substring(0, 7) + '-01';
      dashboardQuery = dashboardQuery
        .gte('mes', mesInicio)
        .lte('mes', mesFim);
    }

    if (vendedorId && vendedorId !== 'todos') {
      dashboardQuery = dashboardQuery.eq('vendedor_id', vendedorId);
    }

    const { data: dashboard, error: dashboardError } = await dashboardQuery
      .order('mes', { ascending: false })
      .order('total_reunioes', { ascending: false });

    if (dashboardError) {
      console.error('Erro ao buscar dashboard:', dashboardError);
    }

    // Reuniões por tipo
    let tiposQuery = supabase
      .from('reunioes')
      .select(`
        tipo_reuniao_id,
        tipos_reuniao:tipo_reuniao_id(nome, cor)
      `);

    if (dataInicio) {
      tiposQuery = tiposQuery.gte('data', dataInicio);
    }

    if (dataFim) {
      tiposQuery = tiposQuery.lte('data', dataFim);
    }

    if (vendedorId && vendedorId !== 'todos') {
      tiposQuery = tiposQuery.eq('vendedor_id', vendedorId);
    }

    const { data: reunioesPorTipo, error: tiposError } = await tiposQuery;

    if (tiposError) {
      console.error('Erro ao buscar tipos:', tiposError);
    }

    // Agrupar por tipo
    const tiposEstatisticas = reunioesPorTipo?.reduce((acc: any, reuniao: any) => {
      const tipo = reuniao.tipos_reuniao;
      if (tipo) {
        const key = tipo.nome;
        if (!acc[key]) {
          acc[key] = {
            nome: tipo.nome,
            cor: tipo.cor,
            total: 0
          };
        }
        acc[key].total++;
      }
      return acc;
    }, {}) || {};

    return NextResponse.json({
      data: {
        total,
        estatisticas,
        dashboard: dashboard || [],
        tipos: Object.values(tiposEstatisticas),
        periodo: {
          data_inicio: dataInicio,
          data_fim: dataFim
        }
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