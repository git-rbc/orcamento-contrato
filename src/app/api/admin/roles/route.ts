import { NextRequest, NextResponse } from 'next/server';
import { RoleService } from '@/services/roles';
import { PermissionService } from '@/services/permissions';
import { AdminService } from '@/services/admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/admin/roles - Listar roles
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é admin
    const temPermissao = await PermissionService.verificarPermissaoUsuario(
      user.id, 
      'sistema', 
      'manage_roles'
    );

    if (!temPermissao) {
      return NextResponse.json({ error: 'Sem permissão para gerenciar roles' }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const includeSystem = url.searchParams.get('includeSystem') !== 'false';

    // Garantir que os roles padrão existam
    await AdminService.verificarECriarRolesPadrao();

    const roles = await RoleService.listar(page, limit, includeSystem);

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Erro ao listar roles:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/roles - Criar novo role
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é admin
    const temPermissao = await PermissionService.verificarPermissaoUsuario(
      user.id, 
      'sistema', 
      'manage_roles'
    );

    if (!temPermissao) {
      return NextResponse.json({ error: 'Sem permissão para gerenciar roles' }, { status: 403 });
    }

    const dadosRole = await request.json();

    // Validação básica
    if (!dadosRole.nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const novoRole = await RoleService.criar(dadosRole);

    return NextResponse.json(novoRole, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar role:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 