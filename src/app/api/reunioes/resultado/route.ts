import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const reuniaoId = searchParams.get('reuniao_id');
    
    if (!reuniaoId) {
      return NextResponse.json(
        { error: 'ID da reunião é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar resultado da reunião específica
    const { data: resultado, error } = await supabase
      .from('reunioes_resultados')
      .select(`
        *,
        reunioes!inner(
          titulo,
          data,
          hora_inicio,
          cliente_id,
          clientes!inner(nome, email)
        ),
        users!created_by(nome, email)
      `)
      .eq('reuniao_id', reuniaoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Resultado não encontrado para esta reunião' },
          { status: 404 }
        );
      }
      
      console.error('Erro ao buscar resultado da reunião:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar resultado da reunião' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: resultado });
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

    const { 
      reuniao_id, 
      resultado, 
      valor_estimado_negocio, 
      proximos_passos, 
      data_follow_up, 
      observacoes 
    } = body;

    // Validação básica
    if (!reuniao_id || !resultado) {
      return NextResponse.json(
        { error: 'ID da reunião e resultado são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a reunião existe
    const { data: reuniao, error: reuniaoError } = await supabase
      .from('reunioes')
      .select('id, status, vendedor_id')
      .eq('id', reuniao_id)
      .single();

    if (reuniaoError || !reuniao) {
      return NextResponse.json(
        { error: 'Reunião não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se já existe resultado para esta reunião
    const { data: resultadoExistente } = await supabase
      .from('reunioes_resultados')
      .select('id')
      .eq('reuniao_id', reuniao_id)
      .single();

    if (resultadoExistente) {
      return NextResponse.json(
        { error: 'Já existe um resultado cadastrado para esta reunião. Use PUT para atualizar.' },
        { status: 409 }
      );
    }

    // Criar resultado da reunião
    const { data: novoResultado, error: createError } = await supabase
      .from('reunioes_resultados')
      .insert({
        reuniao_id,
        resultado,
        valor_estimado_negocio: valor_estimado_negocio || 0,
        proximos_passos,
        data_follow_up,
        observacoes,
        created_by: user.id
      })
      .select(`
        *,
        reunioes!inner(
          titulo,
          data,
          hora_inicio,
          cliente_id,
          clientes!inner(nome, email)
        ),
        users!created_by(nome, email)
      `)
      .single();

    if (createError) {
      console.error('Erro ao criar resultado da reunião:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar resultado da reunião' },
        { status: 500 }
      );
    }

    // Atualizar status da reunião se necessário
    let novoStatusReuniao = reuniao.status;
    
    if (resultado === 'conversao' || resultado === 'sucesso') {
      novoStatusReuniao = 'concluida';
    } else if (resultado === 'cancelamento') {
      novoStatusReuniao = 'cancelada';
    } else if (resultado === 'reagendamento') {
      novoStatusReuniao = 'reagendada';
    } else if (['sem_interesse', 'follow_up', 'proposta_enviada'].includes(resultado)) {
      novoStatusReuniao = 'concluida';
    }

    if (novoStatusReuniao !== reuniao.status) {
      await supabase
        .from('reunioes')
        .update({ 
          status: novoStatusReuniao,
          updated_at: new Date().toISOString()
        })
        .eq('id', reuniao_id);
    }

    // Atualizar performance do vendedor (chamar função do banco)
    if (reuniao.vendedor_id) {
      await supabase.rpc('calcular_performance_vendedor', {
        p_vendedor_id: reuniao.vendedor_id
      });
    }

    return NextResponse.json({ data: novoResultado }, { status: 201 });
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
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const { 
      id,
      resultado, 
      valor_estimado_negocio, 
      proximos_passos, 
      data_follow_up, 
      observacoes 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do resultado é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o resultado existe
    const { data: resultadoExistente, error: existeError } = await supabase
      .from('reunioes_resultados')
      .select(`
        id, 
        reuniao_id,
        reunioes!inner(vendedor_id)
      `)
      .eq('id', id)
      .single();

    if (existeError || !resultadoExistente) {
      return NextResponse.json(
        { error: 'Resultado não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar resultado
    const { data: resultadoAtualizado, error: updateError } = await supabase
      .from('reunioes_resultados')
      .update({
        resultado,
        valor_estimado_negocio: valor_estimado_negocio || 0,
        proximos_passos,
        data_follow_up,
        observacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        reunioes!inner(
          titulo,
          data,
          hora_inicio,
          cliente_id,
          clientes!inner(nome, email)
        ),
        users!created_by(nome, email)
      `)
      .single();

    if (updateError) {
      console.error('Erro ao atualizar resultado da reunião:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar resultado da reunião' },
        { status: 500 }
      );
    }

    // Recalcular performance do vendedor
    if ((resultadoExistente as any).reunioes?.vendedor_id) {
      await supabase.rpc('calcular_performance_vendedor', {
        p_vendedor_id: (resultadoExistente as any).reunioes.vendedor_id
      });
    }

    return NextResponse.json({ data: resultadoAtualizado });
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
        { error: 'ID do resultado é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar dados antes de deletar (para recalcular performance)
    const { data: resultadoExistente } = await supabase
      .from('reunioes_resultados')
      .select(`
        id,
        reuniao_id,
        reunioes!inner(vendedor_id)
      `)
      .eq('id', id)
      .single();

    // Deletar resultado
    const { error } = await supabase
      .from('reunioes_resultados')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar resultado da reunião:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar resultado da reunião' },
        { status: 500 }
      );
    }

    // Recalcular performance do vendedor
    if ((resultadoExistente as any)?.reunioes?.vendedor_id) {
      await supabase.rpc('calcular_performance_vendedor', {
        p_vendedor_id: (resultadoExistente as any).reunioes.vendedor_id
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Resultado deletado com sucesso' 
    });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}