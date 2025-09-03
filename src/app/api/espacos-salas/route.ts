import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const localId = searchParams.get('local_id');
    const tipo = searchParams.get('tipo'); // sala_reuniao, espaco_evento, sala_virtual, auditorio, sala_treinamento
    const capacidadeMin = searchParams.get('capacidade_min');
    const capacidadeMax = searchParams.get('capacidade_max');
    const ativo = searchParams.get('ativo');
    const equipamento = searchParams.get('equipamento'); // filtrar por equipamento específico
    const incluirDisponibilidade = searchParams.get('incluir_disponibilidade') === 'true';
    const dataConsulta = searchParams.get('data_consulta'); // para verificar disponibilidade

    let query = supabase
      .from('espacos_salas')
      .select(`
        *,
        locais_atendimento!local_id(
          id,
          nome,
          codigo,
          cor,
          tipo,
          cidade,
          endereco
        )
      `);

    // Aplicar filtros
    if (localId && localId !== 'todos') {
      query = query.eq('local_id', localId);
    }

    if (tipo && tipo !== 'todos') {
      query = query.eq('tipo', tipo);
    }

    if (capacidadeMin) {
      query = query.gte('capacidade', parseInt(capacidadeMin));
    }

    if (capacidadeMax) {
      query = query.lte('capacidade', parseInt(capacidadeMax));
    }

    if (ativo !== null && ativo !== 'todos') {
      query = query.eq('ativo', ativo === 'true');
    }

    if (equipamento) {
      // Buscar espaços que tenham o equipamento específico
      query = query.contains('equipamentos', [equipamento]);
    }

    const { data: espacos, error } = await query.order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar espaços/salas:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar espaços/salas' },
        { status: 500 }
      );
    }

    let espacosComDisponibilidade = espacos;

    // Incluir informações de disponibilidade se solicitado
    if (incluirDisponibilidade && dataConsulta) {
      const espacoIds = espacos?.map(e => e.id) || [];

      if (espacoIds.length > 0) {
        // Buscar reuniões agendadas para a data
        const { data: reunioesAgendadas } = await supabase
          .from('reunioes')
          .select('espaco_evento_id, hora_inicio, hora_fim, status')
          .in('espaco_evento_id', espacoIds)
          .eq('data', dataConsulta)
          .neq('status', 'cancelada');

        espacosComDisponibilidade = espacos?.map(espaco => {
          const reunioesEspaco = reunioesAgendadas?.filter(r => r.espaco_evento_id === espaco.id) || [];
          
          return {
            ...espaco,
            disponibilidade: {
              data_consulta: dataConsulta,
              reunioes_agendadas: reunioesEspaco.length,
              horarios_ocupados: reunioesEspaco.map(r => ({
                hora_inicio: r.hora_inicio,
                hora_fim: r.hora_fim,
                status: r.status
              })),
              disponivel: reunioesEspaco.length === 0 // Simplificado - pode ser melhorado
            }
          };
        });
      }
    }

    // Estatísticas dos espaços
    const estatisticas = {
      total_espacos: espacos?.length || 0,
      espacos_ativos: espacos?.filter(e => e.ativo).length || 0,
      por_tipo: espacos?.reduce((acc: any, espaco: any) => {
        acc[espaco.tipo] = (acc[espaco.tipo] || 0) + 1;
        return acc;
      }, {}) || {},
      por_local: espacos?.reduce((acc: any, espaco: any) => {
        const localNome = espaco.locais_atendimento?.nome || 'Sem Local';
        acc[localNome] = (acc[localNome] || 0) + 1;
        return acc;
      }, {}) || {},
      capacidade_total: espacos?.reduce((sum, e) => sum + (e.capacidade || 0), 0) || 0,
      capacidade_media: espacos?.length > 0 
        ? Math.round(espacos.reduce((sum, e) => sum + (e.capacidade || 0), 0) / espacos.length)
        : 0
    };

    // Equipamentos mais comuns
    const equipamentosFrequentes: any = {};
    espacos?.forEach(espaco => {
      if (espaco.equipamentos && Array.isArray(espaco.equipamentos)) {
        espaco.equipamentos.forEach((eq: string) => {
          equipamentosFrequentes[eq] = (equipamentosFrequentes[eq] || 0) + 1;
        });
      }
    });

    const response = {
      espacos: espacosComDisponibilidade || [],
      estatisticas,
      equipamentos_disponiveis: Object.entries(equipamentosFrequentes)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .map(([equipamento, quantidade]) => ({ equipamento, quantidade })),
      filtros_aplicados: {
        local_id: localId,
        tipo: tipo,
        capacidade_min: capacidadeMin,
        capacidade_max: capacidadeMax,
        ativo: ativo,
        equipamento: equipamento,
        incluir_disponibilidade: incluirDisponibilidade,
        data_consulta: dataConsulta
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

    const { 
      local_id, 
      nome, 
      capacidade, 
      tipo, 
      equipamentos, 
      descricao, 
      ativo = true 
    } = body;

    // Validações básicas
    if (!local_id || !nome || !capacidade || !tipo) {
      return NextResponse.json(
        { error: 'Local, nome, capacidade e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o local existe
    const { data: localExiste, error: localError } = await supabase
      .from('locais_atendimento')
      .select('id')
      .eq('id', local_id)
      .single();

    if (localError || !localExiste) {
      return NextResponse.json(
        { error: 'Local de atendimento não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se já existe espaço com mesmo nome no local
    const { data: nomeExistente } = await supabase
      .from('espacos_salas')
      .select('id')
      .eq('local_id', local_id)
      .eq('nome', nome)
      .single();

    if (nomeExistente) {
      return NextResponse.json(
        { error: 'Já existe um espaço com este nome neste local' },
        { status: 409 }
      );
    }

    // Validar equipamentos (deve ser array)
    let equipamentosValidados = [];
    if (equipamentos) {
      if (Array.isArray(equipamentos)) {
        equipamentosValidados = equipamentos;
      } else if (typeof equipamentos === 'string') {
        equipamentosValidados = [equipamentos];
      }
    }

    // Criar espaço
    const { data: novoEspaco, error: createError } = await supabase
      .from('espacos_salas')
      .insert({
        local_id,
        nome,
        capacidade,
        tipo,
        equipamentos: equipamentosValidados,
        descricao,
        ativo
      })
      .select(`
        *,
        locais_atendimento!local_id(
          nome,
          codigo,
          cor,
          cidade
        )
      `)
      .single();

    if (createError) {
      console.error('Erro ao criar espaço/sala:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar espaço/sala' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: novoEspaco }, { status: 201 });
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
      nome, 
      capacidade, 
      tipo, 
      equipamentos, 
      descricao, 
      ativo 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do espaço é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o espaço existe
    const { data: espacoExistente, error: existeError } = await supabase
      .from('espacos_salas')
      .select('id, local_id, nome')
      .eq('id', id)
      .single();

    if (existeError || !espacoExistente) {
      return NextResponse.json(
        { error: 'Espaço/sala não encontrado' },
        { status: 404 }
      );
    }

    // Verificar conflito de nome se nome foi alterado
    if (nome && nome !== espacoExistente.nome) {
      const { data: nomeConflito } = await supabase
        .from('espacos_salas')
        .select('id')
        .eq('local_id', espacoExistente.local_id)
        .eq('nome', nome)
        .neq('id', id)
        .single();

      if (nomeConflito) {
        return NextResponse.json(
          { error: 'Já existe outro espaço com este nome neste local' },
          { status: 409 }
        );
      }
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (capacidade !== undefined) updateData.capacidade = capacidade;
    if (tipo !== undefined) updateData.tipo = tipo;
    if (equipamentos !== undefined) {
      if (Array.isArray(equipamentos)) {
        updateData.equipamentos = equipamentos;
      } else if (typeof equipamentos === 'string') {
        updateData.equipamentos = [equipamentos];
      } else {
        updateData.equipamentos = [];
      }
    }
    if (descricao !== undefined) updateData.descricao = descricao;
    if (ativo !== undefined) updateData.ativo = ativo;
    
    updateData.updated_at = new Date().toISOString();

    // Atualizar espaço
    const { data: espacoAtualizado, error: updateError } = await supabase
      .from('espacos_salas')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        locais_atendimento!local_id(
          nome,
          codigo,
          cor,
          cidade
        )
      `)
      .single();

    if (updateError) {
      console.error('Erro ao atualizar espaço/sala:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar espaço/sala' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: espacoAtualizado });
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
        { error: 'ID do espaço é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se existem reuniões usando este espaço
    const { data: reunioesVinculadas } = await supabase
      .from('reunioes')
      .select('id')
      .eq('espaco_evento_id', id)
      .limit(1);

    if (reunioesVinculadas && reunioesVinculadas.length > 0) {
      // Não deletar fisicamente, apenas desativar
      const { data: espacoDesativado, error } = await supabase
        .from('espacos_salas')
        .update({ 
          ativo: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao desativar espaço/sala:', error);
        return NextResponse.json(
          { error: 'Erro ao desativar espaço/sala' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        data: espacoDesativado,
        message: 'Espaço desativado pois possui reuniões vinculadas' 
      });
    } else {
      // Deletar fisicamente se não houver reuniões
      const { error } = await supabase
        .from('espacos_salas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar espaço/sala:', error);
        return NextResponse.json(
          { error: 'Erro ao deletar espaço/sala' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true,
        message: 'Espaço deletado com sucesso' 
      });
    }
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}