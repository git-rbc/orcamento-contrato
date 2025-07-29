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

    // Total de produtos
    const { count: total } = await supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true });

    // Produtos ativos
    const { count: ativos } = await supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Ativo');

    // Produtos por categoria
    const { data: categorias } = await supabase
      .from('categorias_produtos')
      .select(`
        id,
        nome
      `)
      .order('nome');

    // Contar produtos por categoria
    const produtosPorCategoria = await Promise.all(
      (categorias || []).map(async (cat) => {
        const { count } = await supabase
          .from('produtos')
          .select('*', { count: 'exact', head: true })
          .eq('categoria_id', cat.id);
        
        return {
          categoria: cat.nome,
          total: count || 0
        };
      })
    );

    // Produtos com taxa
    const { count: comTaxa } = await supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true })
      .eq('tem_taxa', true);

    return NextResponse.json({
      total: total || 0,
      ativos: ativos || 0,
      inativos: (total || 0) - (ativos || 0),
      comTaxa: comTaxa || 0,
      semTaxa: (total || 0) - (comTaxa || 0),
      porCategoria: produtosPorCategoria
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
} 