import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { createErrorResponse } from '@/lib/api-utils';

export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseAdmin = createSupabaseAdminClient();
    const body = await request.json();
    const { nome, descricao, tem_taxa_padrao, ordem, ativo } = body;

    // Validações
    if (!nome || nome.trim().length === 0) {
      return NextResponse.json(
        createErrorResponse('Nome da categoria é obrigatório'),
        { status: 400 }
      );
    }

    // Verificar se a categoria existe
    const { data: existingCategoria } = await supabaseAdmin
      .from('categorias_produtos')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingCategoria) {
      return NextResponse.json(
        createErrorResponse('Categoria não encontrada'),
        { status: 404 }
      );
    }

    // Verificar se já existe outra categoria com o mesmo nome
    const { data: duplicateCategoria } = await supabaseAdmin
      .from('categorias_produtos')
      .select('id')
      .ilike('nome', nome.trim())
      .neq('id', id)
      .single();

    if (duplicateCategoria) {
      return NextResponse.json(
        createErrorResponse('Já existe uma categoria com este nome'),
        { status: 400 }
      );
    }

    // Atualizar categoria
    const { data: categoria, error } = await supabaseAdmin
      .from('categorias_produtos')
      .update({
        nome: nome.trim(),
        descricao: descricao?.trim() || null,
        tem_taxa_padrao: tem_taxa_padrao !== false,
        ordem: parseInt(ordem) || 0,
        ativo: ativo !== false
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar categoria:', error);
      return NextResponse.json(
        createErrorResponse('Erro ao atualizar categoria'),
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: categoria,
      message: 'Categoria atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      createErrorResponse('Erro interno do servidor'),
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseAdmin = createSupabaseAdminClient();

    // Verificar se a categoria existe
    const { data: existingCategoria } = await supabaseAdmin
      .from('categorias_produtos')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingCategoria) {
      return NextResponse.json(
        createErrorResponse('Categoria não encontrada'),
        { status: 404 }
      );
    }

    // Verificar se existem produtos associados a esta categoria
    const { data: produtos, error: produtosError } = await supabaseAdmin
      .from('produtos')
      .select('id')
      .eq('categoria_id', id)
      .limit(1);

    if (produtosError) {
      console.error('Erro ao verificar produtos:', produtosError);
      return NextResponse.json(
        createErrorResponse('Erro ao verificar produtos associados'),
        { status: 500 }
      );
    }

    if (produtos && produtos.length > 0) {
      return NextResponse.json(
        createErrorResponse('Não é possível excluir categoria que possui produtos associados'),
        { status: 400 }
      );
    }

    // Excluir categoria
    const { error } = await supabaseAdmin
      .from('categorias_produtos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir categoria:', error);
      return NextResponse.json(
        createErrorResponse('Erro ao excluir categoria'),
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Categoria excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      createErrorResponse('Erro interno do servidor'),
      { status: 500 }
    );
  }
} 