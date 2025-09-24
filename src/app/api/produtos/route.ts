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

    // Parâmetros de busca e paginação
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const categoria = searchParams.get('categoria') || '';
    const seguimento = searchParams.get('seguimento') || '';
    const status = searchParams.get('status') || '';

    // Calcular offset
    const offset = (page - 1) * limit;

    // Construir query base
    let query = supabase
      .from('produtos')
      .select(`
        *,
        categoria:categorias_produtos(*),
        espacos:produtos_espacos(
          espaco:espacos_eventos(*)
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%,codigo.ilike.%${search}%`);
    }

    if (categoria) {
      query = query.eq('categoria_id', categoria);
    }

    if (seguimento) {
      query = query.eq('seguimento', seguimento);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Ordenação simples por nome
    query = query.order('nome', { ascending: true });

    // Paginação
    query = query.range(offset, offset + limit - 1);

    // Executar query
    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
    }

    // Calcular total de páginas
    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages
    });

  } catch (error) {
    console.error('Erro na API de produtos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    
    // Verificar se é uma busca por IDs (para o hook de cálculo)
    if (body.ids && Array.isArray(body.ids)) {
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('id, nome, tem_taxa, reajuste, valor, status')
        .in('id', body.ids);

      if (error) {
        console.error('Erro ao buscar produtos por IDs:', error);
        return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: produtos || []
      });
    }
    
    // Validações básicas para criação de produto
    if (!body.nome || !body.categoria_id || !body.seguimento || body.valor === undefined) {
      return NextResponse.json(
        { error: 'Nome, categoria, seguimento e valor são obrigatórios' },
        { status: 400 }
      );
    }

    // Chamar a função RPC para criar o produto e associar espaços
    const { data, error } = await supabase.rpc('create_product_with_spaces', {
      nome_in: body.nome,
      categoria_id_in: body.categoria_id,
      seguimento_in: body.seguimento,
      status_in: body.status || 'Ativo',
      valor_in: body.valor,
      tem_taxa_in: body.tem_taxa !== false,
      reajuste_in: body.reajuste === true,
      desconto_percentual_in: body.desconto_percentual || 0,
      vinculado_convidados_in: body.vinculado_convidados === true,
      descricao_in: body.descricao || null,
      observacoes_in: body.observacoes || null,
      espaco_ids_in: body.espaco_ids || []
    });

    if (error) {
      console.error('Erro ao criar produto via RPC:', error);
      return NextResponse.json(
        { error: 'Erro ao criar produto: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data 
    }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de produtos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 