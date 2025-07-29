import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/services/admin';
import { PermissionService } from '@/services/permissions';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/admin/users - Listar usuários
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se tem permissão para ver usuários
    const temPermissao = await PermissionService.verificarPermissaoUsuario(
      user.id, 
      'usuarios', 
      'read'
    );

    if (!temPermissao) {
      return NextResponse.json({ error: 'Sem permissão para visualizar usuários' }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || undefined;
    const role_id = url.searchParams.get('role_id') || undefined;
    const ativo = url.searchParams.get('ativo');

    const filters = {
      search,
      role_id,
      ativo: ativo ? ativo === 'true' : undefined
    };

    const usuarios = await AdminService.listarUsuarios(filters, page, limit);

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Criar novo usuário
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se tem permissão para criar usuários
    const temPermissao = await PermissionService.verificarPermissaoUsuario(
      user.id, 
      'usuarios', 
      'create'
    );

    if (!temPermissao) {
      return NextResponse.json({ error: 'Sem permissão para criar usuários' }, { status: 403 });
    }

    const dadosUsuario = await request.json();

    // Validação básica
    if (!dadosUsuario.email || !dadosUsuario.nome || !dadosUsuario.role_id) {
      return NextResponse.json({ 
        error: 'Email, nome e role são obrigatórios' 
      }, { status: 400 });
    }

    const novoUsuario = await AdminService.criarUsuario(dadosUsuario, user.id);

    return NextResponse.json(novoUsuario, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    
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