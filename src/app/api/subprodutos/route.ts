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
    const status = searchParams.get('status') || '';
    const produtoId = searchParams.get('produto_id') || '';

    // Calcular offset
    const offset = (page - 1) * limit;

    // Construir query base - incluindo produtos associados
    let query = supabase
      .from('subprodutos')
      .select(`
        *,
        produtos_associados:produtos_subprodutos(
          produto:produtos(id, nome)
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%,codigo.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Filtrar por produto específico se fornecido
    if (produtoId) {
      // Buscar IDs dos subprodutos associados ao produto
      const { data: associacoes } = await supabase
        .from('produtos_subprodutos')
        .select('subproduto_id')
        .eq('produto_id', produtoId);
      
      if (associacoes && associacoes.length > 0) {
        const subprodutoIds = associacoes.map(a => a.subproduto_id);
        query = query.in('id', subprodutoIds);
      } else {
        // Se não há subprodutos associados, retornar lista vazia
        return NextResponse.json({
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        });
      }
    }

    // Ordenação por nome
    query = query.order('nome', { ascending: true });

    // Paginação
    query = query.range(offset, offset + limit - 1);

    // Executar query
    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar sub-produtos:', error);
      return NextResponse.json({ error: 'Erro ao buscar sub-produtos' }, { status: 500 });
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
    console.error('Erro na API de sub-produtos:', error);
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
    const { nome, valor, descricao, status, produtoIds } = body;

    // Validações
    if (!nome || !valor || !produtoIds || produtoIds.length === 0) {
      return NextResponse.json(
        { error: 'Nome, valor e pelo menos um produto são obrigatórios' },
        { status: 400 }
      );
    }

    // Gerar código automático
    const { data: lastSubproduto } = await supabase
      .from('subprodutos')
      .select('codigo')
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastSubproduto && lastSubproduto[0]?.codigo) {
      const lastCode = lastSubproduto[0].codigo;
      const match = lastCode.match(/SUB-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const codigo = `SUB-${nextNumber.toString().padStart(4, '0')}`;

    // Criar sub-produto
    const { data: subproduto, error: subprodutoError } = await supabase
      .from('subprodutos')
      .insert({
        nome,
        valor: parseFloat(valor),
        descricao,
        codigo,
        status: status || 'Ativo'
      })
      .select()
      .single();

    if (subprodutoError) {
      console.error('Erro ao criar sub-produto:', subprodutoError);
      return NextResponse.json({ error: 'Erro ao criar sub-produto' }, { status: 500 });
    }

    // Criar associações com produtos
    const associacoes = produtoIds.map((produtoId: string) => ({
      produto_id: produtoId,
      subproduto_id: subproduto.id
    }));

    const { error: associacaoError } = await supabase
      .from('produtos_subprodutos')
      .insert(associacoes);

    if (associacaoError) {
      console.error('Erro ao criar associações:', associacaoError);
      // Limpar sub-produto criado se a associação falhar
      await supabase.from('subprodutos').delete().eq('id', subproduto.id);
      return NextResponse.json({ error: 'Erro ao associar produtos' }, { status: 500 });
    }

    return NextResponse.json(subproduto, { status: 201 });

  } catch (error) {
    console.error('Erro na criação de sub-produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, nome, valor, descricao, status, produtoIds } = body;

    // Validações
    if (!id || !nome || !valor || !produtoIds || produtoIds.length === 0) {
      return NextResponse.json(
        { error: 'ID, nome, valor e pelo menos um produto são obrigatórios' },
        { status: 400 }
      );
    }

    // Atualizar sub-produto
    const { data: subproduto, error: updateError } = await supabase
      .from('subprodutos')
      .update({
        nome,
        valor: parseFloat(valor),
        descricao,
        status: status || 'Ativo'
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar sub-produto:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar sub-produto' }, { status: 500 });
    }

    // Remover associações antigas
    await supabase
      .from('produtos_subprodutos')
      .delete()
      .eq('subproduto_id', id);

    // Criar novas associações
    const associacoes = produtoIds.map((produtoId: string) => ({
      produto_id: produtoId,
      subproduto_id: id
    }));

    const { error: associacaoError } = await supabase
      .from('produtos_subprodutos')
      .insert(associacoes);

    if (associacaoError) {
      console.error('Erro ao atualizar associações:', associacaoError);
      return NextResponse.json({ error: 'Erro ao atualizar associações' }, { status: 500 });
    }

    return NextResponse.json(subproduto);

  } catch (error) {
    console.error('Erro na atualização de sub-produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    // TODO: Verificar se sub-produto está sendo usado em propostas
    // Implementar quando necessário

    // Deletar sub-produto (as associações serão deletadas automaticamente por CASCADE)
    const { error: deleteError } = await supabase
      .from('subprodutos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao deletar sub-produto:', deleteError);
      return NextResponse.json({ error: 'Erro ao deletar sub-produto' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro na exclusão de sub-produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}