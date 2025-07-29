import { createClient } from '@supabase/supabase-js';
import { 
  User, 
  UserComplete,
  CreateUserDTO, 
  UpdateUserDTO, 
  PaginatedResponse,
  AdminFilters,
  Role
} from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Supabase com service role para operações do servidor
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export class AdminService {
  // Listar usuários com filtros e paginação
  static async listarUsuarios(
    filters: AdminFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<UserComplete>> {
    let query = supabaseAdmin
      .from('v_user_complete')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters.role_id) {
      query = query.eq('role_id', filters.role_id);
    }
    if (filters.ativo !== undefined) {
      query = query.eq('ativo', filters.ativo);
    }
    if (filters.search) {
      query = query.or(`nome.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    // Aplicar paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Ordenar por nome
    query = query.order('nome', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao listar usuários: ${error.message}`);
    }

    // Transformar dados para UserComplete
    const usuarios: UserComplete[] = (data || []).map(user => ({
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role_legacy,
      role_id: user.role_id,
      ativo: user.ativo,
      created_at: user.created_at,
      updated_at: user.updated_at,
      role_info: user.role_id ? {
        id: user.role_id,
        nome: user.role_nome,
        descricao: user.role_descricao,
        cor: user.role_cor,
        nivel_hierarquia: user.nivel_hierarquia
      } : undefined
    }));

    return {
      data: usuarios,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  // Buscar usuário por ID com informações completas
  static async buscarUsuarioPorId(id: string): Promise<UserComplete | null> {
    const { data, error } = await supabaseAdmin
      .from('v_user_complete')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar usuário: ${error.message}`);
    }

    return {
      id: data.id,
      email: data.email,
      nome: data.nome,
      role: data.role_legacy,
      role_id: data.role_id,
      ativo: data.ativo,
      created_at: data.created_at,
      updated_at: data.updated_at,
      role_info: data.role_id ? {
        id: data.role_id,
        nome: data.role_nome,
        descricao: data.role_descricao,
        cor: data.role_cor,
        nivel_hierarquia: data.nivel_hierarquia
      } : undefined
    };
  }

  // Buscar usuário por email
  static async buscarUsuarioPorEmail(email: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar usuário por email: ${error.message}`);
    }

    return data;
  }

  // Criar novo usuário (apenas para admins)
  static async criarUsuario(
    dadosUsuario: CreateUserDTO,
    adminId: string
  ): Promise<User> {
    // Validações
    if (!dadosUsuario.email?.trim()) {
      throw new Error('Email é obrigatório');
    }
    if (!dadosUsuario.nome?.trim()) {
      throw new Error('Nome é obrigatório');
    }
    if (!dadosUsuario.role_id?.trim()) {
      throw new Error('Role é obrigatório');
    }
    if (!dadosUsuario.password?.trim()) {
      throw new Error('Senha é obrigatória');
    }

    const emailLimpo = dadosUsuario.email.trim().toLowerCase();

    // Verificar se email já existe na tabela users
    const usuarioExistente = await this.buscarUsuarioPorEmail(emailLimpo);
    if (usuarioExistente) {
      throw new Error('Já existe um usuário com este email');
    }

    // Verificar se role existe
    const { data: role, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('*')
      .eq('id', dadosUsuario.role_id)
      .single();

    if (roleError || !role) {
      throw new Error('Role especificado não existe');
    }

    // Verificar hierarquia - admin só pode criar usuários de nível inferior
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('v_user_complete')
      .select('nivel_hierarquia')
      .eq('id', adminId)
      .single();

    if (adminError) {
      throw new Error('Erro ao verificar permissões do administrador');
    }

    if (adminUser.nivel_hierarquia < 100 && role.nivel_hierarquia >= adminUser.nivel_hierarquia) {
      throw new Error('Você não pode criar usuários com nível hierárquico igual ou superior ao seu');
    }

    let authUserId: string | null = null;
    let createdInAuth = false;

    try {
      // 1. Criar usuário no Supabase Auth primeiro (trigger criará automaticamente na tabela users)
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emailLimpo,
        password: dadosUsuario.password,
        email_confirm: true,
        user_metadata: {
          nome: dadosUsuario.nome.trim()
        }
      });

      if (authError) {
        // Tratamento específico para emails duplicados no auth
        if (authError.message?.includes('already registered') || 
            authError.message?.includes('email already registered') ||
            authError.message?.includes('duplicate')) {
          throw new Error('Este email já está registrado no sistema');
        }
        throw new Error(`Erro ao criar usuário na autenticação: ${authError.message}`);
      }

      if (!authUser?.user?.id) {
        throw new Error('Erro inesperado: ID do usuário não foi gerado');
      }

      authUserId = authUser.user.id;
      createdInAuth = true;

      // 2. Aguardar um pouco para garantir que o trigger foi executado
      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. Atualizar o registro criado pelo trigger com nossos dados específicos
      const dadosAtualizacao = {
        nome: dadosUsuario.nome.trim(),
        role: role.nivel_hierarquia >= 80 ? 'admin' : 'vendedor', // Compatibilidade
        role_id: dadosUsuario.role_id,
        ativo: dadosUsuario.ativo ?? true,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('users')
        .update(dadosAtualizacao)
        .eq('id', authUserId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar dados do usuário: ${error.message}`);
      }

      if (!data) {
        throw new Error('Erro inesperado: dados do usuário não foram retornados');
      }

      // 4. Registrar log de sucesso
      await this.registrarLog(adminId, 'USER_CREATED', 'user', data.id, {
        usuario_criado: {
          email: data.email,
          nome: data.nome,
          role_id: data.role_id
        }
      });

      return data;

    } catch (error) {
      // 5. Rollback: Se criou no auth mas falhou na atualização, remover do auth
      if (createdInAuth && authUserId) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        } catch (rollbackError) {
          console.error('ERRO CRÍTICO: Falha no rollback do auth:', rollbackError);
          // Log este erro mas não sobrescrever o erro original
        }
      }

      // Re-throw do erro original
      throw error;
    }
  }

  // Atualizar usuário
  static async atualizarUsuario(
    id: string,
    dadosUsuario: UpdateUserDTO,
    adminId: string
  ): Promise<User> {
    // Verificar se usuário existe
    const usuarioExistente = await this.buscarUsuarioPorId(id);
    if (!usuarioExistente) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se admin pode gerenciar este usuário
    const podeGerenciar = await this.podeGerenciarUsuario(adminId, id);
    if (!podeGerenciar) {
      throw new Error('Você não tem permissão para gerenciar este usuário');
    }

    // Se está alterando role, verificar hierarquia
    if (dadosUsuario.role_id && dadosUsuario.role_id !== usuarioExistente.role_id) {
      const { data: novoRole, error: roleError } = await supabaseAdmin
        .from('roles')
        .select('*')
        .eq('id', dadosUsuario.role_id)
        .single();

      if (roleError || !novoRole) {
        throw new Error('Role especificado não existe');
      }

      const { data: adminUser, error: adminError } = await supabaseAdmin
        .from('v_user_complete')
        .select('nivel_hierarquia')
        .eq('id', adminId)
        .single();

      if (adminError) {
        throw new Error('Erro ao verificar permissões do administrador');
      }

      if (adminUser.nivel_hierarquia < 100 && novoRole.nivel_hierarquia >= adminUser.nivel_hierarquia) {
        throw new Error('Você não pode atribuir roles de nível hierárquico igual ou superior ao seu');
      }

      // Atualizar role legado para compatibilidade
      (dadosUsuario as any).role = novoRole.nivel_hierarquia >= 80 ? 'admin' : 'vendedor';
    }

    const dadosAtualizacao = {
      ...dadosUsuario,
      nome: dadosUsuario.nome?.trim(),
    };

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(dadosAtualizacao)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar usuário: ${error.message}`);
    }

    // Registrar log
    await this.registrarLog(adminId, 'USER_UPDATED', 'user', id, {
      dados_anteriores: {
        nome: usuarioExistente.nome,
        role_id: usuarioExistente.role_id,
        ativo: usuarioExistente.ativo
      },
      dados_novos: dadosAtualizacao
    });

    return data;
  }

  // Ativar/Desativar usuário
  static async alterarStatusUsuario(
    id: string,
    ativo: boolean,
    adminId: string
  ): Promise<User> {
    const usuarioExistente = await this.buscarUsuarioPorId(id);
    if (!usuarioExistente) {
      throw new Error('Usuário não encontrado');
    }

    const podeGerenciar = await this.podeGerenciarUsuario(adminId, id);
    if (!podeGerenciar) {
      throw new Error('Você não tem permissão para gerenciar este usuário');
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ ativo })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao alterar status do usuário: ${error.message}`);
    }

    // Registrar log
    await this.registrarLog(adminId, ativo ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'user', id, {
      status_anterior: usuarioExistente.ativo,
      status_novo: ativo
    });

    return data;
  }

  // Resetar senha do usuário
  static async resetarSenhaUsuario(
    id: string,
    novaSenha: string,
    adminId: string
  ): Promise<void> {
    const usuarioExistente = await this.buscarUsuarioPorId(id);
    if (!usuarioExistente) {
      throw new Error('Usuário não encontrado');
    }

    const podeGerenciar = await this.podeGerenciarUsuario(adminId, id);
    if (!podeGerenciar) {
      throw new Error('Você não tem permissão para gerenciar este usuário');
    }

    // Resetar senha no Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: novaSenha
    });

    if (error) {
      throw new Error(`Erro ao resetar senha: ${error.message}`);
    }

    // Registrar log
    await this.registrarLog(adminId, 'USER_PASSWORD_RESET', 'user', id, {
      usuario_afetado: usuarioExistente.email
    });
  }

  // Verificar se admin pode gerenciar usuário (baseado na hierarquia)
  static async podeGerenciarUsuario(adminId: string, targetUserId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .rpc('can_manage_user', {
        manager_id: adminId,
        target_user_id: targetUserId
      });

    if (error) {
      return false;
    }

    return data || false;
  }

  // Obter estatísticas de usuários
  static async obterEstatisticas(): Promise<{
    total: number;
    ativos: number;
    inativos: number;
    admins: number;
    vendedores: number;
    porRole: { role: string; quantidade: number; cor: string }[];
    recemCriados: number; // últimos 30 dias
  }> {
    // Total de usuários
    const { count: total, error: errorTotal } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (errorTotal) {
      throw new Error(`Erro ao contar usuários: ${errorTotal.message}`);
    }

    // Usuários ativos
    const { count: ativos, error: errorAtivos } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    if (errorAtivos) {
      throw new Error(`Erro ao contar usuários ativos: ${errorAtivos.message}`);
    }

    // Usuários por role legado
    const { count: admins, error: errorAdmins } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('ativo', true);

    const { count: vendedores, error: errorVendedores } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'vendedor')
      .eq('ativo', true);

    if (errorAdmins || errorVendedores) {
      throw new Error('Erro ao contar usuários por tipo');
    }

    // Usuários por role (novo sistema)
    const { data: usuariosPorRole, error: errorRoles } = await supabaseAdmin
      .from('v_user_complete')
      .select('role_nome, role_cor')
      .eq('ativo', true)
      .not('role_id', 'is', null);

    if (errorRoles) {
      throw new Error(`Erro ao buscar usuários por role: ${errorRoles.message}`);
    }

    // Contar por role
    const contadorRoles: Record<string, { quantidade: number; cor: string }> = {};
    usuariosPorRole?.forEach(user => {
      if (user.role_nome) {
        if (!contadorRoles[user.role_nome]) {
          contadorRoles[user.role_nome] = { quantidade: 0, cor: user.role_cor || '#6B7280' };
        }
        contadorRoles[user.role_nome].quantidade++;
      }
    });

    const porRole = Object.entries(contadorRoles).map(([role, info]) => ({
      role,
      quantidade: info.quantidade,
      cor: info.cor
    }));

    // Usuários criados nos últimos 30 dias
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);

    const { count: recemCriados, error: errorRecentes } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dataLimite.toISOString());

    if (errorRecentes) {
      throw new Error(`Erro ao contar usuários recentes: ${errorRecentes.message}`);
    }

    return {
      total: total || 0,
      ativos: ativos || 0,
      inativos: (total || 0) - (ativos || 0),
      admins: admins || 0,
      vendedores: vendedores || 0,
      porRole,
      recemCriados: recemCriados || 0
    };
  }

  // Verificar e criar roles padrão do sistema
  static async verificarECriarRolesPadrao(): Promise<void> {
    try {
      // Verificar se os roles padrão já existem
      const rolesExistentes = await supabaseAdmin
        .from('roles')
        .select('nome');

      const nomesExistentes = new Set(rolesExistentes.data?.map(r => r.nome) || []);

      const rolesPadrao = [
        {
          nome: 'Super Admin',
          descricao: 'Administrador total do sistema com acesso a tudo',
          cor: '#DC2626',
          nivel_hierarquia: 100,
          sistema: false, // Super Admin pode ser editado
          ativo: true
        },
        {
          nome: 'Admin',
          descricao: 'Administrador geral com permissões de gestão',
          cor: '#EA580C',
          nivel_hierarquia: 80,
          sistema: true, // Admin é protegido
          ativo: true
        },
        {
          nome: 'Vendedor',
          descricao: 'Vendedor padrão com permissões básicas',
          cor: '#2563EB',
          nivel_hierarquia: 50,
          sistema: true, // Vendedor é protegido
          ativo: true
        }
      ];

      // Criar apenas os roles que não existem
      for (const role of rolesPadrao) {
        if (!nomesExistentes.has(role.nome)) {
          await supabaseAdmin
            .from('roles')
            .insert(role);
          console.log(`Role criado: ${role.nome}`);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar/criar roles padrão:', error);
    }
  }

  // Registrar log administrativo
  private static async registrarLog(
    adminId: string,
    acao: string,
    recurso: string,
    recursoId?: string,
    detalhes?: any
  ): Promise<void> {
    try {
      await supabaseAdmin.rpc('log_admin_action', {
        admin_id: adminId,
        acao_param: acao,
        recurso_param: recurso,
        recurso_id_param: recursoId,
        detalhes_param: detalhes
      });
    } catch (error) {
      // Log em caso de erro, mas não impedir a operação principal
      console.error('Erro ao registrar log administrativo:', error);
    }
  }

  // Listar roles disponíveis para atribuição
  static async listarRolesDisponiveis(adminId: string): Promise<Role[]> {
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('v_user_complete')
      .select('nivel_hierarquia')
      .eq('id', adminId)
      .single();

    if (adminError) {
      throw new Error('Erro ao verificar permissões do administrador');
    }

    // Buscar roles que o usuário pode atribuir baseado na hierarquia
    let query = supabaseAdmin
      .from('roles')
      .select('*')
      .eq('ativo', true)
      .order('nivel_hierarquia', { ascending: false });

    // Super Admin pode atribuir qualquer role incluindo Super Admin
    if (adminUser.nivel_hierarquia === 100) {
      query = query.lte('nivel_hierarquia', 100);
    } else {
      // Outros admins só podem atribuir roles de nível inferior ao seu
      query = query.lt('nivel_hierarquia', adminUser.nivel_hierarquia);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar roles: ${error.message}`);
    }

    return data || [];
  }
}