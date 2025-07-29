import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Schema de validação para cupom
const cupomSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  codigo: z.string().min(1, 'Código é obrigatório').max(50),
  descricao: z.string().optional(),
  tipo_desconto: z.enum(['percentual', 'valor_fixo']),
  valor_desconto: z.number().positive('Valor deve ser maior que zero'),
  valor_minimo_pedido: z.number().positive().optional().nullable(),
  data_inicio: z.string().nullable().optional(),
  data_fim: z.string().nullable().optional(),
  limite_uso: z.number().int().positive().optional().nullable(),
  cliente_especifico_id: z.string().uuid().optional().nullable(),
  dias_semana: z.array(z.enum(['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'])).optional().nullable(),
  nivel_acesso: z.enum(['admin', 'vendedor']),
  ativo: z.boolean().default(true)
}).refine((data) => {
  // Validação específica para percentual
  if (data.tipo_desconto === 'percentual' && data.valor_desconto > 100) {
    return false;
  }
  return true;
}, {
  message: 'Desconto percentual não pode ser maior que 100%',
  path: ['valor_desconto']
}).refine((data) => {
  // Validação de datas
  if (data.data_inicio && data.data_fim) {
    return new Date(data.data_inicio) <= new Date(data.data_fim);
  }
  return true;
}, {
  message: 'Data de início deve ser anterior à data de fim',
  path: ['data_fim']
});

// GET - Listar cupons
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar dados do usuário com role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        role_id,
        roles!inner(
          id,
          nome,
          nivel_hierarquia
        )
      `)
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('DEBUG - Erro ao buscar usuário:', { userError, userData });
      return NextResponse.json({ 
        message: 'Usuário não encontrado',
        error: userError?.message,
        details: userError
      }, { status: 404 });
    }

    console.log('DEBUG - Dados do usuário:', { 
      userId: userData.id, 
      roles: userData.roles,
      roleCount: userData.roles?.length 
    });

    // Verificar se tem permissão para acessar cupons
    const isAdmin = (userData.roles as any).nivel_hierarquia >= 80;
    const isVendedor = (userData.roles as any).nivel_hierarquia >= 50;
    
    console.log('DEBUG - Permissões:', { isAdmin, isVendedor, nivel: (userData.roles as any).nivel_hierarquia });

    if (!isVendedor) {
      return NextResponse.json({ message: 'Sem permissão para acessar cupons' }, { status: 403 });
    }

    // Buscar cupons baseado no nível de acesso
    let query = supabase
      .from('cupons_desconto')
      .select('*')
      .order('created_at', { ascending: false });

    // Se não for admin, filtrar apenas cupons disponíveis para vendedor
    if (!isAdmin) {
      query = query.eq('nivel_acesso', 'vendedor').eq('ativo', true);
    }

    console.log('DEBUG - Executando query para cupons...');
    const { data: cupons, error: cuponsError } = await query;

    if (cuponsError) {
      console.error('Erro ao buscar cupons:', cuponsError);
      return NextResponse.json({ 
        message: 'Erro ao buscar cupons',
        error: cuponsError.message,
        details: cuponsError
      }, { status: 500 });
    }

    console.log('DEBUG - Cupons encontrados:', cupons?.length || 0);

    return NextResponse.json(cupons || []);

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar cupom
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar dados do usuário com role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        role_id,
        roles!inner(
          id,
          nome,
          nivel_hierarquia
        )
      `)
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.log('DEBUG - Erro ao buscar usuário:', { userError, userData });
      return NextResponse.json({ 
        message: 'Usuário não encontrado',
        debug: { userError, userData }
      }, { status: 404 });
    }

    if ((userData.roles as any).nivel_hierarquia < 80) {
      console.log('DEBUG - Usuário sem permissão:', (userData.roles as any).nivel_hierarquia);
      return NextResponse.json({ 
        message: 'Apenas administradores podem criar cupons',
        debug: { nivel: (userData.roles as any).nivel_hierarquia, role: (userData.roles as any).nome }
      }, { status: 403 });
    }

    const body = await request.json();
    
    // Validar dados
    const validatedData = cupomSchema.parse(body);

    // Verificar se código já existe
    const { data: existingCupom, error: checkError } = await supabase
      .from('cupons_desconto')
      .select('codigo')
      .eq('codigo', validatedData.codigo)
      .single();

    if (existingCupom) {
      return NextResponse.json({ message: 'Código de cupom já existe' }, { status: 400 });
    }

    // Criar cupom
    const { data: cupom, error: createError } = await supabase
      .from('cupons_desconto')
      .insert({
        ...validatedData,
        created_by: user.id,
        uso_atual: 0,
        uso_por_cliente: 1
      })
      .select()
      .single();

    if (createError) {
      console.error('Erro ao criar cupom:', createError);
      return NextResponse.json({ message: 'Erro ao criar cupom' }, { status: 500 });
    }

    return NextResponse.json(cupom, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        message: 'Dados inválidos',
        errors: error.errors
      }, { status: 400 });
    }

    console.error('Erro interno:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar cupom
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar dados do usuário com role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        role_id,
        roles!inner(
          nivel_hierarquia
        )
      `)
      .eq('id', user.id)
      .single();

    if (userError || !userData || (userData.roles as any).nivel_hierarquia < 80) {
      return NextResponse.json({ message: 'Apenas administradores podem editar cupons' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ message: 'ID do cupom é obrigatório' }, { status: 400 });
    }

    // Validar dados
    const validatedData = cupomSchema.parse(updateData);

    // Verificar se código já existe em outro cupom
    const { data: existingCupom, error: checkError } = await supabase
      .from('cupons_desconto')
      .select('id, codigo')
      .eq('codigo', validatedData.codigo)
      .neq('id', id)
      .single();

    if (existingCupom) {
      return NextResponse.json({ message: 'Código de cupom já existe' }, { status: 400 });
    }

    // Atualizar cupom
    const { data: cupom, error: updateError } = await supabase
      .from('cupons_desconto')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar cupom:', updateError);
      return NextResponse.json({ message: 'Erro ao atualizar cupom' }, { status: 500 });
    }

    return NextResponse.json(cupom);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        message: 'Dados inválidos',
        errors: error.errors
      }, { status: 400 });
    }

    console.error('Erro interno:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}