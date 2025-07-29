import { createClient } from '@supabase/supabase-js';
import { 
  Role, 
  CreateRoleDTO, 
  UpdateRoleDTO, 
  PaginatedResponse,
  RolePermissionsDTO,
  RoleMenusDTO,
  Permissao,
  Menu
} from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Supabase com service role para operações do servidor
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export class RoleService {
  // Listar roles com paginação
  static async listar(
    page: number = 1,
    limit: number = 10,
    includeSystem: boolean = true
  ): Promise<PaginatedResponse<Role>> {
    let query = supabaseAdmin
      .from('roles')
      .select('*', { count: 'exact' });

    // Filtrar roles do sistema se necessário
    if (!includeSystem) {
      query = query.eq('sistema', false);
    }

    // Aplicar paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Ordenar por nível hierárquico e nome
    query = query.order('nivel_hierarquia', { ascending: false })
                 .order('nome', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao listar roles: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  // Buscar role por ID
  static async buscarPorId(id: string): Promise<Role | null> {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar role: ${error.message}`);
    }

    return data;
  }

  // Buscar role por nome
  static async buscarPorNome(nome: string): Promise<Role | null> {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('*')
      .eq('nome', nome.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar role por nome: ${error.message}`);
    }

    return data;
  }

  // Criar novo role
  static async criar(dadosRole: CreateRoleDTO): Promise<Role> {
    // Validações
    if (!dadosRole.nome?.trim()) {
      throw new Error('Nome é obrigatório');
    }

    // Verificar se nome já existe
    const roleExistente = await this.buscarPorNome(dadosRole.nome);
    if (roleExistente) {
      throw new Error('Já existe um role com este nome');
    }

    const novoRole = {
      ...dadosRole,
      nome: dadosRole.nome.trim(),
      descricao: dadosRole.descricao?.trim() || null,
      cor: dadosRole.cor || '#6B7280',
      nivel_hierarquia: dadosRole.nivel_hierarquia || 0,
      ativo: dadosRole.ativo ?? true,
      sistema: false // Roles criados manualmente nunca são do sistema
    };

    const { data, error } = await supabaseAdmin
      .from('roles')
      .insert(novoRole)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar role: ${error.message}`);
    }

    return data;
  }

  // Atualizar role
  static async atualizar(id: string, dadosRole: UpdateRoleDTO): Promise<Role> {
    // Verificar se role existe
    const roleExistente = await this.buscarPorId(id);
    if (!roleExistente) {
      throw new Error('Role não encontrado');
    }

    // Não permitir edição de roles do sistema
    if (roleExistente.sistema) {
      throw new Error('Roles do sistema não podem ser editados');
    }

    // Verificar nome único se estiver sendo alterado
    if (dadosRole.nome && dadosRole.nome !== roleExistente.nome) {
      const roleComMesmoNome = await this.buscarPorNome(dadosRole.nome);
      if (roleComMesmoNome) {
        throw new Error('Já existe um role com este nome');
      }
    }

    const dadosAtualizacao = {
      ...dadosRole,
      nome: dadosRole.nome?.trim(),
      descricao: dadosRole.descricao?.trim() || null,
    };

    const { data, error } = await supabaseAdmin
      .from('roles')
      .update(dadosAtualizacao)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar role: ${error.message}`);
    }

    return data;
  }

  // Excluir role
  static async excluir(id: string): Promise<void> {
    // Verificar se role existe
    const role = await this.buscarPorId(id);
    if (!role) {
      throw new Error('Role não encontrado');
    }

    // Não permitir exclusão de roles do sistema
    if (role.sistema) {
      throw new Error('Roles do sistema não podem ser excluídos');
    }

    // Verificar se há usuários usando este role
    const { count, error: errorUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', id);

    if (errorUsers) {
      throw new Error(`Erro ao verificar usuários: ${errorUsers.message}`);
    }

    if (count && count > 0) {
      throw new Error(`Não é possível excluir. Há ${count} usuário(s) usando este role`);
    }

    const { error } = await supabaseAdmin
      .from('roles')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir role: ${error.message}`);
    }
  }

  // Obter permissões de um role
  static async obterPermissoes(roleId: string): Promise<Permissao[]> {
    const { data, error } = await supabaseAdmin
      .from('role_permissoes')
      .select(`
        permissao:permissoes(*)
      `)
      .eq('role_id', roleId)
      .eq('concedida', true);

    if (error) {
      throw new Error(`Erro ao buscar permissões: ${error.message}`);
    }

    return (data || []).map((item: any) => item.permissao as Permissao).filter(Boolean);
  }

  // Definir permissões de um role
  static async definirPermissoes(dados: RolePermissionsDTO): Promise<void> {
    const { role_id, permissoes } = dados;

    // Verificar se role existe
    const role = await this.buscarPorId(role_id);
    if (!role) {
      throw new Error('Role não encontrado');
    }

    // Não permitir alterar permissões de roles do sistema
    if (role.sistema) {
      throw new Error('Permissões de roles do sistema não podem ser alteradas');
    }

    // Remover permissões existentes
    const { error: errorDelete } = await supabaseAdmin
      .from('role_permissoes')
      .delete()
      .eq('role_id', role_id);

    if (errorDelete) {
      throw new Error(`Erro ao remover permissões existentes: ${errorDelete.message}`);
    }

    // Inserir novas permissões
    if (permissoes.length > 0) {
      const novasPermissoes = permissoes.map(p => ({
        role_id,
        permissao_id: p.permissao_id,
        concedida: p.concedida
      }));

      const { error: errorInsert } = await supabaseAdmin
        .from('role_permissoes')
        .insert(novasPermissoes);

      if (errorInsert) {
        throw new Error(`Erro ao definir permissões: ${errorInsert.message}`);
      }
    }
  }

  // Obter menus de um role
  static async obterMenus(roleId: string): Promise<Menu[]> {
    const { data, error } = await supabaseAdmin
      .from('role_menus')
      .select(`
        menu:menus(*)
      `)
      .eq('role_id', roleId)
      .eq('visivel', true);

    if (error) {
      throw new Error(`Erro ao buscar menus: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // A API do Supabase pode retornar um array para a relação 'menu:menus(*)'
    // então usamos flatMap para achatar o array de arrays resultante.
    return data.flatMap((item: any) => item.menu || []).filter(Boolean);
  }

  // Definir menus de um role
  static async definirMenus(dados: RoleMenusDTO): Promise<void> {
    const { role_id, menus } = dados;

    // Verificar se role existe
    const role = await this.buscarPorId(role_id);
    if (!role) {
      throw new Error('Role não encontrado');
    }

    // Remover menus existentes
    const { error: errorDelete } = await supabaseAdmin
      .from('role_menus')
      .delete()
      .eq('role_id', role_id);

    if (errorDelete) {
      throw new Error(`Erro ao remover menus existentes: ${errorDelete.message}`);
    }

    // Inserir novos menus
    if (menus.length > 0) {
      const novosMenus = menus.map(m => ({
        role_id,
        menu_id: m.menu_id,
        visivel: m.visivel
      }));

      const { error: errorInsert } = await supabaseAdmin
        .from('role_menus')
        .insert(novosMenus);

      if (errorInsert) {
        throw new Error(`Erro ao definir menus: ${errorInsert.message}`);
      }
    }
  }

  // Listar todos os roles para select/dropdown (sem paginação)
  static async listarParaSelect(): Promise<Pick<Role, 'id' | 'nome' | 'cor' | 'nivel_hierarquia'>[]> {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('id, nome, cor, nivel_hierarquia')
      .eq('ativo', true)
      .order('nivel_hierarquia', { ascending: false })
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar roles: ${error.message}`);
    }

    return data || [];
  }

  // Obter estatísticas de roles
  static async obterEstatisticas(): Promise<{
    total: number;
    ativos: number;
    sistema: number;
    personalizados: number;
    usuariosComRole: number;
    usuariosSemRole: number;
  }> {
    // Total de roles
    const { count: total, error: errorTotal } = await supabaseAdmin
      .from('roles')
      .select('*', { count: 'exact', head: true });

    if (errorTotal) {
      throw new Error(`Erro ao contar roles: ${errorTotal.message}`);
    }

    // Roles ativos
    const { count: ativos, error: errorAtivos } = await supabaseAdmin
      .from('roles')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    if (errorAtivos) {
      throw new Error(`Erro ao contar roles ativos: ${errorAtivos.message}`);
    }

    // Roles do sistema
    const { count: sistema, error: errorSistema } = await supabaseAdmin
      .from('roles')
      .select('*', { count: 'exact', head: true })
      .eq('sistema', true);

    if (errorSistema) {
      throw new Error(`Erro ao contar roles do sistema: ${errorSistema.message}`);
    }

    // Usuários com role_id definido
    const { count: usuariosComRole, error: errorComRole } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('role_id', 'is', null);

    if (errorComRole) {
      throw new Error(`Erro ao contar usuários com role: ${errorComRole.message}`);
    }

    // Usuários sem role_id (legados)
    const { count: usuariosSemRole, error: errorSemRole } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('role_id', null);

    if (errorSemRole) {
      throw new Error(`Erro ao contar usuários sem role: ${errorSemRole.message}`);
    }

    return {
      total: total || 0,
      ativos: ativos || 0,
      sistema: sistema || 0,
      personalizados: (total || 0) - (sistema || 0),
      usuariosComRole: usuariosComRole || 0,
      usuariosSemRole: usuariosSemRole || 0
    };
  }
} 