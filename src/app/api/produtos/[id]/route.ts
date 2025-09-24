import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('produtos')
      .select(`
        *,
        categoria:categorias_produtos(*),
        espacos:produtos_espacos(
          espaco:espacos_eventos(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar produto:', error);
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Erro na API de produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    
    // Chamar a função RPC para atualizar o produto e associar espaços
    const { data, error } = await supabase.rpc('update_product_with_spaces', {
      product_id_in: id,
      nome_in: body.nome,
      categoria_id_in: body.categoria_id,
      seguimento_in: body.seguimento,
      status_in: body.status,
      valor_in: body.valor,
      tem_taxa_in: body.tem_taxa,
      reajuste_in: body.reajuste,
      desconto_percentual_in: body.desconto_percentual,
      vinculado_convidados_in: body.vinculado_convidados === true,
      descricao_in: body.descricao,
      observacoes_in: body.observacoes,
      espaco_ids_in: body.espaco_ids
    });

    if (error) {
      console.error('Erro ao atualizar produto via RPC:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar produto: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Erro na API de produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
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
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se o usuário tem permissão para deletar (gerente ou superior)
    const { data: userProfile } = await supabase
      .from('users')
      .select(`
        id,
        roles (
          nivel_hierarquia
        )
      `)
      .eq('id', user.id)
      .single();

    // O roles é um array, então precisamos acessar o primeiro elemento
    const roles = userProfile?.roles;
    let roleNivel = null;
    
    if (Array.isArray(roles) && roles.length > 0) {
      roleNivel = roles[0]?.nivel_hierarquia;
    }

    if (!roleNivel || roleNivel < 70) {
      return NextResponse.json(
        { error: 'Sem permissão para excluir produtos' },
        { status: 403 }
      );
    }

    // Deletar produto
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir produto:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir produto' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro na API de produto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 