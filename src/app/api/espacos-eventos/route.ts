import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { EspacoEventoFilters } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Extrair parâmetros de filtro da URL
    const { searchParams } = new URL(request.url);
    const filters: EspacoEventoFilters = {
      nome: searchParams.get('nome') || undefined,
      cidade: searchParams.get('cidade') || undefined,
      capacidade_min: searchParams.get('capacidade_min') ? parseInt(searchParams.get('capacidade_min')!) : undefined,
      capacidade_max: searchParams.get('capacidade_max') ? parseInt(searchParams.get('capacidade_max')!) : undefined,
      ativo: searchParams.get('ativo') ? searchParams.get('ativo') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    };

    // Construir query base - incluir layouts
    let query = supabase
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
      `, { count: 'exact' });

    // Aplicar filtros
    if (filters.nome) {
      query = query.ilike('nome', `%${filters.nome}%`);
    }
    
    if (filters.cidade) {
      query = query.ilike('cidade', `%${filters.cidade}%`);
    }

    if (filters.capacidade_min) {
      query = query.gte('capacidade_maxima', filters.capacidade_min);
    }

    if (filters.capacidade_max) {
      query = query.lte('capacidade_maxima', filters.capacidade_max);
    }

    if (filters.ativo !== undefined) {
      query = query.eq('ativo', filters.ativo);
    }

    // Aplicar paginação e ordenação
    const from = ((filters.page || 1) - 1) * (filters.limit || 10);
    const to = from + (filters.limit || 10) - 1;

    const { data, error, count } = await query
      .order('cidade')
      .order('ordem')
      .order('nome')
      .range(from, to);

    if (error) {
      console.error('Erro ao buscar espaços:', error);
      return NextResponse.json({ error: 'Erro ao buscar espaços' }, { status: 500 });
    }

    // Calcular informações de paginação
    const totalPages = Math.ceil((count || 0) / (filters.limit || 10));

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page: filters.page || 1,
      limit: filters.limit || 10,
      totalPages
    });

  } catch (error) {
    console.error('Erro na API de espaços:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validações básicas
    if (!body.nome || !body.cidade || !body.capacidade_maxima) {
      return NextResponse.json(
        { error: 'Nome, cidade e capacidade máxima são obrigatórios' },
        { status: 400 }
      );
    }

    if (body.capacidade_maxima <= 0) {
      return NextResponse.json(
        { error: 'Capacidade máxima deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Verificar se já existe um espaço com o mesmo nome na mesma cidade
    const { data: existingSpace } = await supabase
      .from('espacos_eventos')
      .select('id')
      .eq('nome', body.nome)
      .eq('cidade', body.cidade)
      .single();

    if (existingSpace) {
      return NextResponse.json(
        { error: 'Já existe um espaço com este nome nesta cidade' },
        { status: 400 }
      );
    }

    // Criar espaço
    const { data, error } = await supabase
      .from('espacos_eventos')
      .insert({
        nome: body.nome,
        cidade: body.cidade,
        capacidade_maxima: body.capacidade_maxima,
        descricao: body.descricao || null,
        tem_espaco_kids: body.tem_espaco_kids !== false,
        tem_pista_led: body.tem_pista_led !== false,
        tem_centro_better: body.tem_centro_better !== false,
        tipo_cadeira: body.tipo_cadeira || null,
        tipo_decorativo: body.tipo_decorativo || null,
        ativo: body.ativo !== false,
        ordem: body.ordem || 0,
        cor: body.cor || '#6B7280'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar espaço:', error);
      return NextResponse.json({ error: 'Erro ao criar espaço' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de espaços:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 