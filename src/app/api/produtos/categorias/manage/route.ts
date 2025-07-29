import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { createErrorResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();

    // Buscar todas as categorias
    const { data: categorias, error } = await supabaseAdmin
      .from('categorias_produtos')
      .select('*')
      .order('ordem', { ascending: true });

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return NextResponse.json(
        createErrorResponse('Erro ao buscar categorias'),
        { status: 500 }
      );
    }

    return NextResponse.json({ data: categorias });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      createErrorResponse('Erro interno do servidor'),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Verificar se já existe categoria com o mesmo nome
    const { data: existingCategoria } = await supabaseAdmin
      .from('categorias_produtos')
      .select('id')
      .ilike('nome', nome.trim())
      .single();

    if (existingCategoria) {
      return NextResponse.json(
        createErrorResponse('Já existe uma categoria com este nome'),
        { status: 400 }
      );
    }

    // Criar categoria
    const { data: categoria, error } = await supabaseAdmin
      .from('categorias_produtos')
      .insert({
        nome: nome.trim(),
        descricao: descricao?.trim() || null,
        tem_taxa_padrao: tem_taxa_padrao !== false,
        ordem: parseInt(ordem) || 0,
        ativo: ativo !== false
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar categoria:', error);
      return NextResponse.json(
        createErrorResponse('Erro ao criar categoria'),
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: categoria,
      message: 'Categoria criada com sucesso'
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      createErrorResponse('Erro interno do servidor'),
      { status: 500 }
    );
  }
} 