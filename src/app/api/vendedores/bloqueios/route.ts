import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const vendedorId = searchParams.get('vendedor_id');
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const tipo = searchParams.get('tipo');
    const ativo = searchParams.get('ativo');

    let query = supabase
      .from('v_bloqueios_vendedores')
      .select('*');

    if (vendedorId && vendedorId !== 'todos') {
      query = query.eq('vendedor_id', vendedorId);
    }

    if (dataInicio) {
      query = query.gte('data_fim', dataInicio);
    }

    if (dataFim) {
      query = query.lte('data_inicio', dataFim);
    }

    if (tipo && tipo !== 'todos') {
      query = query.eq('tipo', tipo);
    }

    if (ativo !== null && ativo !== '') {
      query = query.eq('ativo', ativo === 'true');
    }

    const { data, error } = await query
      .order('data_inicio', { ascending: true })
      .order('vendedor_nome');

    if (error) {
      console.error('Erro ao buscar bloqueios:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar bloqueios' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // Verificar se é admin ou se está criando bloqueio próprio
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin' && body.vendedor_id !== user.id) {
      return NextResponse.json(
        { error: 'Você só pode criar bloqueios para si mesmo' },
        { status: 403 }
      );
    }

    // Verificar se já existe bloqueio no mesmo período
    let conflitosQuery = supabase
      .from('bloqueios_vendedores')
      .select('id, motivo, data_inicio, data_fim')
      .eq('vendedor_id', body.vendedor_id)
      .eq('ativo', true)
      .or(`and(data_inicio.lte.${body.data_fim},data_fim.gte.${body.data_inicio})`);

    // Se tem horário específico, verificar sobreposição de horários também
    if (body.hora_inicio && body.hora_fim) {
      conflitosQuery = conflitosQuery.or(
        `and(hora_inicio.lte.${body.hora_fim},hora_fim.gte.${body.hora_inicio}),` +
        `and(hora_inicio.is.null,hora_fim.is.null)`
      );
    }

    const { data: conflitos } = await conflitosQuery;

    if (conflitos && conflitos.length > 0) {
      return NextResponse.json(
        { 
          error: 'Já existe bloqueio no período solicitado',
          conflitos
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('bloqueios_vendedores')
      .insert({
        ...body,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar bloqueio:', error);
      return NextResponse.json(
        { error: 'Erro ao criar bloqueio' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do bloqueio é obrigatório' },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // Verificar se existe e se o usuário tem permissão
    const { data: bloqueio } = await supabase
      .from('bloqueios_vendedores')
      .select('vendedor_id, created_by')
      .eq('id', id)
      .single();

    if (!bloqueio) {
      return NextResponse.json(
        { error: 'Bloqueio não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const podeEditar = userData?.role === 'admin' || 
                       bloqueio.vendedor_id === user.id || 
                       bloqueio.created_by === user.id;

    if (!podeEditar) {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar este bloqueio' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('bloqueios_vendedores')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar bloqueio:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar bloqueio' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID do bloqueio é obrigatório' },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // Verificar se existe e se o usuário tem permissão
    const { data: bloqueio } = await supabase
      .from('bloqueios_vendedores')
      .select('vendedor_id, created_by')
      .eq('id', id)
      .single();

    if (!bloqueio) {
      return NextResponse.json(
        { error: 'Bloqueio não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const podeRemover = userData?.role === 'admin' || 
                        bloqueio.vendedor_id === user.id || 
                        bloqueio.created_by === user.id;

    if (!podeRemover) {
      return NextResponse.json(
        { error: 'Você não tem permissão para remover este bloqueio' },
        { status: 403 }
      );
    }

    // Marcar como inativo ao invés de deletar
    const { error } = await supabase
      .from('bloqueios_vendedores')
      .update({ ativo: false })
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover bloqueio:', error);
      return NextResponse.json(
        { error: 'Erro ao remover bloqueio' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}