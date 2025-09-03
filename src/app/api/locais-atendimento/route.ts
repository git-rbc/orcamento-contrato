import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const tipo = searchParams.get('tipo'); // virtual, presencial, treinamento
    const ativo = searchParams.get('ativo');
    const cidade = searchParams.get('cidade');
    const incluirEspacos = searchParams.get('incluir_espacos') === 'true';

    let query = supabase
      .from('locais_atendimento')
      .select('*');

    // Aplicar filtros
    if (tipo && tipo !== 'todos') {
      query = query.eq('tipo', tipo);
    }

    if (ativo !== null && ativo !== 'todos') {
      query = query.eq('ativo', ativo === 'true');
    }

    if (cidade && cidade !== 'todos') {
      query = query.ilike('cidade', `%${cidade}%`);
    }

    const { data: locais, error } = await query.order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar locais de atendimento:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar locais de atendimento' },
        { status: 500 }
      );
    }

    let locaisComEspacos = locais;

    // Incluir espaços se solicitado
    if (incluirEspacos && locais && locais.length > 0) {
      const localIds = locais.map(local => local.id);

      const { data: espacos } = await supabase
        .from('espacos_salas')
        .select('*')
        .in('local_id', localIds)
        .eq('ativo', true)
        .order('nome', { ascending: true });

      locaisComEspacos = locais.map(local => ({
        ...local,
        espacos: espacos?.filter(espaco => espaco.local_id === local.id) || []
      }));
    }

    // Estatísticas por local (reuniões dos últimos 30 dias)
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);
    const dataInicioStr = dataInicio.toISOString().split('T')[0];

    const { data: estatisticasReunioes } = await supabase
      .from('reunioes')
      .select('local_atendimento')
      .gte('data', dataInicioStr)
      .in('local_atendimento', locais?.map(l => l.codigo) || []);

    // Contar reuniões por local
    const reunioesPorLocal = estatisticasReunioes?.reduce((acc: any, reuniao: any) => {
      const local = reuniao.local_atendimento;
      acc[local] = (acc[local] || 0) + 1;
      return acc;
    }, {}) || {};

    // Adicionar estatísticas aos locais
    const locaisComEstatisticas = locaisComEspacos?.map(local => ({
      ...local,
      estatisticas_30_dias: {
        total_reunioes: reunioesPorLocal[local.codigo] || 0
      }
    }));

    const response = {
      locais: locaisComEstatisticas,
      resumo: {
        total_locais: locais?.length || 0,
        locais_ativos: locais?.filter(l => l.ativo).length || 0,
        por_tipo: locais?.reduce((acc: any, local: any) => {
          acc[local.tipo] = (acc[local.tipo] || 0) + 1;
          return acc;
        }, {}) || {},
        cidades_distintas: locais ? [...new Set(locais.map(l => l.cidade).filter(Boolean))] : []
      },
      filtros_aplicados: {
        tipo: tipo,
        ativo: ativo,
        cidade: cidade,
        incluir_espacos: incluirEspacos
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

    const { nome, codigo, cor, tipo, cidade, endereco, ativo = true } = body;

    // Validações básicas
    if (!nome || !codigo || !cor || !tipo) {
      return NextResponse.json(
        { error: 'Nome, código, cor e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se código já existe
    const { data: codigoExistente } = await supabase
      .from('locais_atendimento')
      .select('id')
      .eq('codigo', codigo)
      .single();

    if (codigoExistente) {
      return NextResponse.json(
        { error: 'Já existe um local com este código' },
        { status: 409 }
      );
    }

    // Criar novo local
    const { data: novoLocal, error } = await supabase
      .from('locais_atendimento')
      .insert({
        nome,
        codigo,
        cor,
        tipo,
        cidade,
        endereco,
        ativo
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar local de atendimento:', error);
      return NextResponse.json(
        { error: 'Erro ao criar local de atendimento' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: novoLocal }, { status: 201 });
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

    const { id, nome, codigo, cor, tipo, cidade, endereco, ativo } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do local é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se código já existe em outro local
    if (codigo) {
      const { data: codigoExistente } = await supabase
        .from('locais_atendimento')
        .select('id')
        .eq('codigo', codigo)
        .neq('id', id)
        .single();

      if (codigoExistente) {
        return NextResponse.json(
          { error: 'Já existe outro local com este código' },
          { status: 409 }
        );
      }
    }

    // Atualizar local
    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (codigo !== undefined) updateData.codigo = codigo;
    if (cor !== undefined) updateData.cor = cor;
    if (tipo !== undefined) updateData.tipo = tipo;
    if (cidade !== undefined) updateData.cidade = cidade;
    if (endereco !== undefined) updateData.endereco = endereco;
    if (ativo !== undefined) updateData.ativo = ativo;
    
    updateData.updated_at = new Date().toISOString();

    const { data: localAtualizado, error } = await supabase
      .from('locais_atendimento')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar local de atendimento:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar local de atendimento' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: localAtualizado });
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
        { error: 'ID do local é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se existem reuniões usando este local
    const { data: reunioesVinculadas } = await supabase
      .from('reunioes')
      .select('id')
      .eq('local_atendimento', id)
      .limit(1);

    if (reunioesVinculadas && reunioesVinculadas.length > 0) {
      // Não deletar fisicamente, apenas desativar
      const { data: localDesativado, error } = await supabase
        .from('locais_atendimento')
        .update({ 
          ativo: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao desativar local de atendimento:', error);
        return NextResponse.json(
          { error: 'Erro ao desativar local de atendimento' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        data: localDesativado,
        message: 'Local desativado pois possui reuniões vinculadas' 
      });
    } else {
      // Deletar fisicamente se não houver reuniões
      const { error } = await supabase
        .from('locais_atendimento')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar local de atendimento:', error);
        return NextResponse.json(
          { error: 'Erro ao deletar local de atendimento' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true,
        message: 'Local deletado com sucesso' 
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