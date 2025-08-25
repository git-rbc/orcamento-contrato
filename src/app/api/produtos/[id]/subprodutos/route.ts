import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const produtoId = resolvedParams.id;
    
    if (!produtoId) {
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 });
    }

    // Parâmetros opcionais
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'Ativo';

    // Buscar sub-produtos associados ao produto específico
    let query = supabase
      .from('subprodutos')
      .select(`
        *,
        produtos_subprodutos!inner(produto_id)
      `)
      .eq('produtos_subprodutos.produto_id', produtoId);

    // Aplicar filtros
    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%,codigo.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Ordenação por nome
    query = query.order('nome', { ascending: true });

    // Executar query
    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar sub-produtos do produto:', error);
      return NextResponse.json({ error: 'Erro ao buscar sub-produtos' }, { status: 500 });
    }

    // Remover o campo de associação da resposta (não é necessário no frontend)
    const subprodutos = (data || []).map(({ produtos_subprodutos, ...subproduto }) => subproduto);

    return NextResponse.json({
      data: subprodutos,
      total: subprodutos.length
    });

  } catch (error) {
    console.error('Erro na API de sub-produtos por produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}