import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar todos os espaços para calcular estatísticas
    const { data: espacos, error } = await supabase
      .from('espacos_eventos')
      .select('*');

    if (error) {
      console.error('Erro ao buscar espaços para estatísticas:', error);
      return NextResponse.json({ error: 'Erro ao calcular estatísticas' }, { status: 500 });
    }

    const stats = {
      total_espacos: espacos.length,
      espacos_ativos: espacos.filter(e => e.ativo).length,
      espacos_inativos: espacos.filter(e => !e.ativo).length,
      total_cidades: new Set(espacos.map(e => e.cidade)).size,
      capacidade_total: espacos.reduce((sum, e) => sum + e.capacidade_maxima, 0),
      capacidade_media: espacos.length > 0 ? Math.round(espacos.reduce((sum, e) => sum + e.capacidade_maxima, 0) / espacos.length) : 0,
      maior_capacidade: espacos.length > 0 ? Math.max(...espacos.map(e => e.capacidade_maxima)) : 0,
      menor_capacidade: espacos.length > 0 ? Math.min(...espacos.map(e => e.capacidade_maxima)) : 0,
      
      // Distribuição por cidade
      por_cidade: espacos.reduce((acc, espaco) => {
        if (!acc[espaco.cidade]) {
          acc[espaco.cidade] = {
            total: 0,
            ativos: 0,
            capacidade_total: 0
          };
        }
        acc[espaco.cidade].total++;
        if (espaco.ativo) acc[espaco.cidade].ativos++;
        acc[espaco.cidade].capacidade_total += espaco.capacidade_maxima;
        return acc;
      }, {} as Record<string, { total: number; ativos: number; capacidade_total: number }>),

      // Características
      com_espaco_kids: espacos.filter(e => e.tem_espaco_kids).length,
      com_pista_led: espacos.filter(e => e.tem_pista_led).length,
      com_centro_better: espacos.filter(e => e.tem_centro_better).length,

      // Tipos de cadeira
      tipos_cadeira: espacos.reduce((acc, espaco) => {
        if (espaco.tipo_cadeira) {
          acc[espaco.tipo_cadeira] = (acc[espaco.tipo_cadeira] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),

      // Tipos decorativos
      tipos_decorativo: espacos.reduce((acc, espaco) => {
        if (espaco.tipo_decorativo) {
          acc[espaco.tipo_decorativo] = (acc[espaco.tipo_decorativo] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),

      // Distribuição por faixa de capacidade
      por_capacidade: {
        pequeno: espacos.filter(e => e.capacidade_maxima <= 150).length, // até 150
        medio: espacos.filter(e => e.capacidade_maxima > 150 && e.capacidade_maxima <= 300).length, // 151-300
        grande: espacos.filter(e => e.capacidade_maxima > 300).length // acima de 300
      }
    };

    return NextResponse.json({ data: stats });

  } catch (error) {
    console.error('Erro na API de estatísticas de espaços:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 