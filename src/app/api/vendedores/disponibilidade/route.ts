import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const vendedorId = searchParams.get('vendedor_id');
    const diaSemana = searchParams.get('dia_semana');
    const cidade = searchParams.get('cidade');
    const ativo = searchParams.get('ativo');

    let query = supabase
      .from('v_disponibilidade_vendedores')
      .select('*');

    if (vendedorId && vendedorId !== 'todos') {
      query = query.eq('vendedor_id', vendedorId);
    }

    if (diaSemana !== null && diaSemana !== '') {
      query = query.eq('dia_semana', parseInt(diaSemana));
    }

    if (cidade && cidade !== 'todas') {
      query = query.eq('cidade', cidade);
    }

    if (ativo !== null && ativo !== '') {
      query = query.eq('ativo', ativo === 'true');
    }

    const { data, error } = await query
      .order('vendedor_nome')
      .order('dia_semana')
      .order('hora_inicio');

    if (error) {
      console.error('Erro ao buscar disponibilidade:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar disponibilidade' },
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

    // Verificar se é admin ou se está definindo sua própria disponibilidade
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin' && body.vendedor_id !== user.id) {
      return NextResponse.json(
        { error: 'Você só pode definir sua própria disponibilidade' },
        { status: 403 }
      );
    }

    // Verificar conflitos de horário para o mesmo vendedor, dia, cidade e ambiente
    const { data: conflitos } = await supabase
      .from('disponibilidade_vendedores')
      .select('id')
      .eq('vendedor_id', body.vendedor_id)
      .eq('dia_semana', body.dia_semana)
      .eq('cidade', body.cidade || '')
      .eq('ambiente', body.ambiente || '')
      .eq('ativo', true)
      .or(`and(hora_inicio.lte.${body.hora_fim},hora_fim.gte.${body.hora_inicio})`);

    if (conflitos && conflitos.length > 0) {
      return NextResponse.json(
        { error: 'Já existe disponibilidade cadastrada neste horário para o vendedor' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('disponibilidade_vendedores')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar disponibilidade:', error);
      return NextResponse.json(
        { error: 'Erro ao criar disponibilidade' },
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
        { error: 'ID da disponibilidade é obrigatório' },
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
    const { data: disponibilidade } = await supabase
      .from('disponibilidade_vendedores')
      .select('vendedor_id')
      .eq('id', id)
      .single();

    if (!disponibilidade) {
      return NextResponse.json(
        { error: 'Disponibilidade não encontrada' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin' && disponibilidade.vendedor_id !== user.id) {
      return NextResponse.json(
        { error: 'Você só pode editar sua própria disponibilidade' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('disponibilidade_vendedores')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar disponibilidade:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar disponibilidade' },
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
        { error: 'ID da disponibilidade é obrigatório' },
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
    const { data: disponibilidade } = await supabase
      .from('disponibilidade_vendedores')
      .select('vendedor_id')
      .eq('id', id)
      .single();

    if (!disponibilidade) {
      return NextResponse.json(
        { error: 'Disponibilidade não encontrada' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin' && disponibilidade.vendedor_id !== user.id) {
      return NextResponse.json(
        { error: 'Você só pode excluir sua própria disponibilidade' },
        { status: 403 }
      );
    }

    // Marcar como inativo ao invés de deletar
    const { error } = await supabase
      .from('disponibilidade_vendedores')
      .update({ 
        ativo: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover disponibilidade:', error);
      return NextResponse.json(
        { error: 'Erro ao remover disponibilidade' },
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