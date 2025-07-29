import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { LayoutTipo } from '@/types/database';

// GET /api/espacos-eventos/[id]/layouts - Listar layouts de um espaço
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
      .from('espacos_eventos_layouts')
      .select('*')
      .eq('espaco_id', id)
      .order('layout');

    if (error) {
      console.error('Erro ao buscar layouts:', error);
      return NextResponse.json({ error: 'Erro ao buscar layouts' }, { status: 500 });
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Erro na API de layouts:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/espacos-eventos/[id]/layouts - Criar/Atualizar layouts de um espaço
export async function POST(
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
    const { layouts } = body;

    if (!Array.isArray(layouts)) {
      return NextResponse.json(
        { error: 'Layouts deve ser um array' },
        { status: 400 }
      );
    }

    // Verificar se o espaço existe
    const { data: espaco } = await supabase
      .from('espacos_eventos')
      .select('id')
      .eq('id', id)
      .single();

    if (!espaco) {
      return NextResponse.json(
        { error: 'Espaço não encontrado' },
        { status: 404 }
      );
    }

    // Remover layouts existentes
    await supabase
      .from('espacos_eventos_layouts')
      .delete()
      .eq('espaco_id', id);

    // Inserir novos layouts
    if (layouts.length > 0) {
      const layoutsToInsert = layouts.map(layout => ({
        espaco_id: id,
        layout: layout.layout,
        capacidade: layout.capacidade,
        pavimento: layout.pavimento || null,
        observacoes: layout.observacoes || null
      }));

      const { error: insertError } = await supabase
        .from('espacos_eventos_layouts')
        .insert(layoutsToInsert);

      if (insertError) {
        console.error('Erro ao inserir layouts:', insertError);
        return NextResponse.json({ error: 'Erro ao salvar layouts' }, { status: 500 });
      }
    }

    // Buscar layouts atualizados
    const { data: updatedLayouts } = await supabase
      .from('espacos_eventos_layouts')
      .select('*')
      .eq('espaco_id', id)
      .order('layout');

    return NextResponse.json({ 
      success: true, 
      data: updatedLayouts || [] 
    });

  } catch (error) {
    console.error('Erro na API de layouts:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/espacos-eventos/[id]/layouts/[layoutId] - Remover um layout específico
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
    const url = new URL(request.url);
    const layoutId = url.pathname.split('/').pop();

    if (!layoutId) {
      return NextResponse.json(
        { error: 'ID do layout não fornecido' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('espacos_eventos_layouts')
      .delete()
      .eq('id', layoutId)
      .eq('espaco_id', id);

    if (error) {
      console.error('Erro ao excluir layout:', error);
      return NextResponse.json({ error: 'Erro ao excluir layout' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro na API de layouts:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 