import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/espacos-eventos/[id] - Buscar espaço específico
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

    const { id } = await params;

    const { data, error } = await supabase
      .from('espacos_eventos')
      .select(`
        *,
        layouts:espacos_eventos_layouts(
          id,
          layout,
          capacidade,
          pavimento,
          observacoes
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar espaço:', error);
      return NextResponse.json({ error: 'Espaço não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Erro na API de espaços:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/espacos-eventos/[id] - Atualizar espaço
export async function PATCH(
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

    const { id } = await params;
    const body = await request.json();
    
    // Validações básicas
    if (body.capacidade_maxima && body.capacidade_maxima <= 0) {
      return NextResponse.json(
        { error: 'Capacidade máxima deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Verificar se existe outro espaço com o mesmo nome na mesma cidade (excluindo o atual)
    if (body.nome && body.cidade) {
      const { data: existingSpace } = await supabase
        .from('espacos_eventos')
        .select('id')
        .eq('nome', body.nome)
        .eq('cidade', body.cidade)
        .neq('id', id)
        .single();

      if (existingSpace) {
        return NextResponse.json(
          { error: 'Já existe um espaço com este nome nesta cidade' },
          { status: 400 }
        );
      }
    }

    // Atualizar espaço
    const { data, error } = await supabase
      .from('espacos_eventos')
      .update({
        nome: body.nome,
        cidade: body.cidade,
        capacidade_maxima: body.capacidade_maxima,
        descricao: body.descricao,
        tem_espaco_kids: body.tem_espaco_kids,
        tem_pista_led: body.tem_pista_led,
        tem_centro_better: body.tem_centro_better,
        tipo_cadeira: body.tipo_cadeira,
        tipo_decorativo: body.tipo_decorativo,
        ativo: body.ativo,
        ordem: body.ordem,
        cor: body.cor
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar espaço:', error);
      return NextResponse.json({ error: 'Erro ao atualizar espaço' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Erro na API de espaços:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/espacos-eventos/[id] - Excluir espaço
export async function DELETE(
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

    const { id } = await params;

    // Verificar se o espaço existe
    const { data: existingSpace } = await supabase
      .from('espacos_eventos')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingSpace) {
      return NextResponse.json({ error: 'Espaço não encontrado' }, { status: 404 });
    }

    // Excluir espaço (layouts serão excluídos automaticamente por CASCADE)
    const { error } = await supabase
      .from('espacos_eventos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir espaço:', error);
      return NextResponse.json({ error: 'Erro ao excluir espaço' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro na API de espaços:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 