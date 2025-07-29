import { NextRequest, NextResponse } from 'next/server';
import { RoleService } from '@/services/roles';
import { PermissionService } from '@/services/permissions';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/admin/roles/[id] - Buscar role por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: roleId } = await params;
    const role = await RoleService.buscarPorId(roleId);

    if (!role) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: role });
  } catch (error) {
    console.error('Erro ao buscar role:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/roles/[id] - Atualizar role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: roleId } = await params;

    // Validação básica
    if (!dadosRole.nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const roleAtualizado = await RoleService.atualizar(roleId, dadosRole);

    return NextResponse.json({ data: roleAtualizado });
  } catch (error) {
    console.error('Erro ao atualizar role:', error);
    
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

// DELETE /api/admin/roles/[id] - Excluir role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: roleId } = await params;

    await RoleService.excluir(roleId);

    return NextResponse.json({ message: 'Role excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir role:', error);
    
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