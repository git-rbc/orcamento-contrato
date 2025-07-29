import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// DELETE - Excluir cupom
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        role_id,
        roles!inner(id, nome, nivel_hierarquia)
      `)
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }

    if ((userData.roles as any).nivel_hierarquia < 80) {
      return NextResponse.json({ message: 'Apenas administradores podem excluir cupons' }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'ID do cupom é obrigatório' }, { status: 400 });
    }

    // Verificar se o cupom existe
    const { data: cupomExistente, error: checkError } = await supabase
      .from('cupons_desconto')
      .select('id, codigo, uso_atual')
      .eq('id', id)
      .single();

    if (checkError || !cupomExistente) {
      return NextResponse.json({ message: 'Cupom não encontrado' }, { status: 404 });
    }

    // Verificar se o cupom foi usado
    if (cupomExistente.uso_atual > 0) {
      return NextResponse.json({ 
        message: 'Não é possível excluir cupom que já foi utilizado' 
      }, { status: 400 });
    }

    // Excluir cupom
    const { error: deleteError } = await supabase
      .from('cupons_desconto')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir cupom:', deleteError);
      return NextResponse.json({ message: 'Erro ao excluir cupom' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Cupom excluído com sucesso',
      cupom_codigo: cupomExistente.codigo 
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}