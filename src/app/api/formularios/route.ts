import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const reuniaoId = searchParams.get('reuniao_id');
    const tipo = searchParams.get('tipo'); // pre_meeting, post_meeting, feedback, avaliacao_cliente, follow_up
    const preenchidoPor = searchParams.get('preenchido_por');
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');

    let query = supabase
      .from('formularios_reuniao')
      .select(`
        *,
        reunioes!inner(
          id,
          titulo,
          data,
          hora_inicio,
          vendedor_id,
          cliente_id,
          clientes!inner(nome, email),
          users!vendedor_id(nome as vendedor_nome, email as vendedor_email)
        ),
        users!preenchido_por(nome, email)
      `);

    if (reuniaoId) {
      query = query.eq('reuniao_id', reuniaoId);
    }

    if (tipo && tipo !== 'todos') {
      query = query.eq('tipo', tipo);
    }

    if (preenchidoPor && preenchidoPor !== 'todos') {
      query = query.eq('preenchido_por', preenchidoPor);
    }

    if (dataInicio) {
      query = query.gte('reunioes.data', dataInicio);
    }

    if (dataFim) {
      query = query.lte('reunioes.data', dataFim);
    }

    const { data: formularios, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar formulários:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar formulários' },
        { status: 500 }
      );
    }

    // Estatísticas dos formulários
    const estatisticas = {
      total_formularios: formularios?.length || 0,
      por_tipo: formularios?.reduce((acc: any, form: any) => {
        acc[form.tipo] = (acc[form.tipo] || 0) + 1;
        return acc;
      }, {}) || {},
      preenchimentos_por_usuario: formularios?.reduce((acc: any, form: any) => {
        const usuario = form.users?.nome || 'Desconhecido';
        acc[usuario] = (acc[usuario] || 0) + 1;
        return acc;
      }, {}) || {}
    };

    const response = {
      formularios: formularios || [],
      estatisticas,
      filtros_aplicados: {
        reuniao_id: reuniaoId,
        tipo: tipo,
        preenchido_por: preenchidoPor,
        data_inicio: dataInicio,
        data_fim: dataFim
      }
    };

    return NextResponse.json({ data: response });
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

    const { reuniao_id, tipo, dados, observacoes } = body;

    // Validações básicas
    if (!reuniao_id || !tipo || !dados) {
      return NextResponse.json(
        { error: 'ID da reunião, tipo e dados são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a reunião existe
    const { data: reuniao, error: reuniaoError } = await supabase
      .from('reunioes')
      .select('id, vendedor_id')
      .eq('id', reuniao_id)
      .single();

    if (reuniaoError || !reuniao) {
      return NextResponse.json(
        { error: 'Reunião não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se já existe formulário deste tipo para esta reunião
    const { data: formularioExistente } = await supabase
      .from('formularios_reuniao')
      .select('id')
      .eq('reuniao_id', reuniao_id)
      .eq('tipo', tipo)
      .single();

    if (formularioExistente) {
      return NextResponse.json(
        { error: 'Já existe um formulário deste tipo para esta reunião. Use PUT para atualizar.' },
        { status: 409 }
      );
    }

    // Validar estrutura dos dados baseado no tipo
    const dadosValidados = validarEstruturaDados(tipo, dados);
    if (!dadosValidados.valido) {
      return NextResponse.json(
        { error: dadosValidados.erro },
        { status: 400 }
      );
    }

    // Criar formulário
    const { data: novoFormulario, error: createError } = await supabase
      .from('formularios_reuniao')
      .insert({
        reuniao_id,
        tipo,
        dados: dadosValidados.dados,
        observacoes,
        preenchido_por: user.id
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
        users!preenchido_por(nome, email)
      `)
      .single();

    if (createError) {
      console.error('Erro ao criar formulário:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar formulário' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: novoFormulario }, { status: 201 });
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

    const { id, dados, observacoes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do formulário é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o formulário existe
    const { data: formularioExistente, error: existeError } = await supabase
      .from('formularios_reuniao')
      .select('id, tipo')
      .eq('id', id)
      .single();

    if (existeError || !formularioExistente) {
      return NextResponse.json(
        { error: 'Formulário não encontrado' },
        { status: 404 }
      );
    }

    // Validar dados se fornecidos
    let dadosValidados: { valido: boolean; dados?: any; erro?: string } = { valido: true, dados };
    if (dados) {
      dadosValidados = validarEstruturaDados(formularioExistente.tipo, dados);
      if (!dadosValidados.valido) {
        return NextResponse.json(
          { error: dadosValidados.erro },
          { status: 400 }
        );
      }
    }

    // Atualizar formulário
    const updateData: any = {};
    if (dados) updateData.dados = dadosValidados.dados;
    if (observacoes !== undefined) updateData.observacoes = observacoes;
    updateData.updated_at = new Date().toISOString();

    const { data: formularioAtualizado, error: updateError } = await supabase
      .from('formularios_reuniao')
      .update(updateData)
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
        users!preenchido_por(nome, email)
      `)
      .single();

    if (updateError) {
      console.error('Erro ao atualizar formulário:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar formulário' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: formularioAtualizado });
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
        { error: 'ID do formulário é obrigatório' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('formularios_reuniao')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar formulário:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar formulário' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Formulário deletado com sucesso' 
    });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função para validar estrutura dos dados baseado no tipo
function validarEstruturaDados(tipo: string, dados: any): { valido: boolean; dados?: any; erro?: string } {
  try {
    if (tipo === 'pre_meeting') {
      // Validar estrutura para formulário pré-reunião
      const camposObrigatorios = ['objetivos_cliente', 'necessidades_identificadas'];
      const camposOpcionais = ['historico_contato', 'observacoes_especiais', 'documentos_necessarios'];
      
      for (const campo of camposObrigatorios) {
        if (!dados[campo]) {
          return { valido: false, erro: `Campo obrigatório ausente: ${campo}` };
        }
      }

    } else if (tipo === 'post_meeting') {
      // Validar estrutura para formulário pós-reunião
      const camposObrigatorios = ['resultado_reuniao', 'pontos_discutidos', 'proximos_passos'];
      
      for (const campo of camposObrigatorios) {
        if (!dados[campo]) {
          return { valido: false, erro: `Campo obrigatório ausente: ${campo}` };
        }
      }

    } else if (tipo === 'feedback') {
      // Validar estrutura para feedback
      const camposObrigatorios = ['avaliacao_geral', 'pontos_positivos'];
      
      for (const campo of camposObrigatorios) {
        if (!dados[campo]) {
          return { valido: false, erro: `Campo obrigatório ausente: ${campo}` };
        }
      }

      // Validar se avaliação está no range correto
      if (dados.avaliacao_geral < 1 || dados.avaliacao_geral > 5) {
        return { valido: false, erro: 'Avaliação geral deve estar entre 1 e 5' };
      }

    } else if (tipo === 'avaliacao_cliente') {
      // Validar estrutura para avaliação do cliente
      const camposObrigatorios = ['satisfacao_atendimento', 'qualidade_informacoes'];
      
      for (const campo of camposObrigatorios) {
        if (!dados[campo]) {
          return { valido: false, erro: `Campo obrigatório ausente: ${campo}` };
        }
      }

    } else if (tipo === 'follow_up') {
      // Validar estrutura para follow-up
      const camposObrigatorios = ['data_contato', 'tipo_contato', 'resultado_contato'];
      
      for (const campo of camposObrigatorios) {
        if (!dados[campo]) {
          return { valido: false, erro: `Campo obrigatório ausente: ${campo}` };
        }
      }
    }

    return { valido: true, dados };
  } catch (error) {
    return { valido: false, erro: 'Estrutura de dados inválida' };
  }
}