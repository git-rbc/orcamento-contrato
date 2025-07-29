import { createClient } from '@supabase/supabase-js';
import { 
  Menu,
  CreateMenuDTO,
  UpdateMenuDTO,
  PaginatedResponse,
  RoleMenusDTO
} from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Supabase com service role para operações do servidor
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export class MenuService {
  // Listar todos os menus (com hierarquia)
  static async listar(
    page: number = 1,
    limit: number = 50,
    includeSystem: boolean = true
  ): Promise<PaginatedResponse<Menu>> {
    let query = supabaseAdmin
      .from('menus')
      .select('*', { count: 'exact' });

    // Filtrar menus do sistema se necessário
    if (!includeSystem) {
      query = query.eq('sistema', false);
    }

    // Aplicar paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Ordenar por ordem e nome
    query = query.order('ordem', { ascending: true })
                 .order('nome', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao listar menus: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  // Listar menus em estrutura hierárquica
  static async listarHierarquia(): Promise<Menu[]> {
    const { data, error } = await supabaseAdmin
      .from('menus')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar menus: ${error.message}`);
    }

    // Organizar em hierarquia
    const menusMap = new Map<string, Menu>();
    const menusRaiz: Menu[] = [];

    // Primeiro, criar mapa de todos os menus
    data?.forEach((menu: any) => {
      menu.children = [];
      menusMap.set(menu.id, menu);
    });

    // Depois, organizar a hierarquia
    data?.forEach((menu: any) => {
      if (menu.parent_id) {
        const parent = menusMap.get(menu.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(menu);
        }
      } else {
        menusRaiz.push(menu);
      }
    });

    return menusRaiz;
  }

  // Obter menus visíveis para um usuário
  static async obterMenusUsuario(userId: string): Promise<Menu[]> {
    const { data, error } = await supabaseAdmin
      .rpc('get_user_menus', {
        user_id: userId
      });

    if (error) {
      throw new Error(`Erro ao obter menus do usuário: ${error.message}`);
    }

    // Organizar em hierarquia
    const menusMap = new Map<string, Menu>();
    const menusRaiz: Menu[] = [];

    // Primeiro, criar mapa de todos os menus
    data?.forEach((menu: any) => {
      menu.children = [];
      menusMap.set(menu.id, menu);
    });

    // Depois, organizar a hierarquia
    data?.forEach((menu: any) => {
      if (menu.parent_id) {
        const parent = menusMap.get(menu.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(menu);
        }
      } else {
        menusRaiz.push(menu);
      }
    });

    return menusRaiz;
  }

  // Buscar menu por ID
  static async buscarPorId(id: string): Promise<Menu | null> {
    const { data, error } = await supabaseAdmin
      .from('menus')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar menu: ${error.message}`);
    }

    return data;
  }

  // Buscar menu por slug
  static async buscarPorSlug(slug: string): Promise<Menu | null> {
    const { data, error } = await supabaseAdmin
      .from('menus')
      .select('*')
      .eq('slug', slug.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar menu por slug: ${error.message}`);
    }

    return data;
  }

  // Criar novo menu
  static async criar(dadosMenu: CreateMenuDTO): Promise<Menu> {
    // Validações
    if (!dadosMenu.nome?.trim()) {
      throw new Error('Nome é obrigatório');
    }
    if (!dadosMenu.slug?.trim()) {
      throw new Error('Slug é obrigatório');
    }

    // Verificar se slug já existe
    const menuExistente = await this.buscarPorSlug(dadosMenu.slug);
    if (menuExistente) {
      throw new Error('Já existe um menu com este slug');
    }

    // Verificar se parent existe (se especificado)
    if (dadosMenu.parent_id) {
      const parent = await this.buscarPorId(dadosMenu.parent_id);
      if (!parent) {
        throw new Error('Menu pai especificado não existe');
      }
    }

    const novoMenu = {
      ...dadosMenu,
      nome: dadosMenu.nome.trim(),
      slug: dadosMenu.slug.trim(),
      icone: dadosMenu.icone?.trim() || null,
      url: dadosMenu.url?.trim() || null,
      ordem: dadosMenu.ordem || 0,
      ativo: dadosMenu.ativo ?? true,
      sistema: false // Menus criados manualmente nunca são do sistema
    };

    const { data, error } = await supabaseAdmin
      .from('menus')
      .insert(novoMenu)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar menu: ${error.message}`);
    }

    return data;
  }

  // Atualizar menu
  static async atualizar(id: string, dadosMenu: UpdateMenuDTO): Promise<Menu> {
    // Verificar se menu existe
    const menuExistente = await this.buscarPorId(id);
    if (!menuExistente) {
      throw new Error('Menu não encontrado');
    }

    // Não permitir edição de menus do sistema
    if (menuExistente.sistema) {
      throw new Error('Menus do sistema não podem ser editados');
    }

    // Verificar slug único se estiver sendo alterado
    if (dadosMenu.slug && dadosMenu.slug !== menuExistente.slug) {
      const menuComMesmoSlug = await this.buscarPorSlug(dadosMenu.slug);
      if (menuComMesmoSlug) {
        throw new Error('Já existe um menu com este slug');
      }
    }

    // Verificar se parent existe (se especificado)
    if (dadosMenu.parent_id && dadosMenu.parent_id !== menuExistente.parent_id) {
      const parent = await this.buscarPorId(dadosMenu.parent_id);
      if (!parent) {
        throw new Error('Menu pai especificado não existe');
      }

      // Evitar referência circular
      if (dadosMenu.parent_id === id) {
        throw new Error('Menu não pode ser pai de si mesmo');
      }
    }

    const dadosAtualizacao = {
      ...dadosMenu,
      nome: dadosMenu.nome?.trim(),
      slug: dadosMenu.slug?.trim(),
      icone: dadosMenu.icone?.trim() || null,
      url: dadosMenu.url?.trim() || null,
    };

    const { data, error } = await supabaseAdmin
      .from('menus')
      .update(dadosAtualizacao)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar menu: ${error.message}`);
    }

    return data;
  }

  // Excluir menu
  static async excluir(id: string): Promise<void> {
    // Verificar se menu existe
    const menu = await this.buscarPorId(id);
    if (!menu) {
      throw new Error('Menu não encontrado');
    }

    // Não permitir exclusão de menus do sistema
    if (menu.sistema) {
      throw new Error('Menus do sistema não podem ser excluídos');
    }

    // Verificar se há submenus
    const { count, error: errorSubmenus } = await supabaseAdmin
      .from('menus')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', id);

    if (errorSubmenus) {
      throw new Error(`Erro ao verificar submenus: ${errorSubmenus.message}`);
    }

    if (count && count > 0) {
      throw new Error(`Não é possível excluir. Este menu possui ${count} submenu(s)`);
    }

    const { error } = await supabaseAdmin
      .from('menus')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir menu: ${error.message}`);
    }
  }

  // Reordenar menus
  static async reordenar(menuIds: string[]): Promise<void> {
    const atualizacoes = menuIds.map((id, index) => 
      supabaseAdmin
        .from('menus')
        .update({ ordem: (index + 1) * 10 })
        .eq('id', id)
    );

    try {
      await Promise.all(atualizacoes);
    } catch (error) {
      throw new Error(`Erro ao reordenar menus: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Listar menus principais (sem parent)
  static async listarPrincipais(): Promise<Menu[]> {
    const { data, error } = await supabaseAdmin
      .from('menus')
      .select('*')
      .is('parent_id', null)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar menus principais: ${error.message}`);
    }

    return data || [];
  }

  // Listar submenus de um menu
  static async listarSubmenus(parentId: string): Promise<Menu[]> {
    const { data, error } = await supabaseAdmin
      .from('menus')
      .select('*')
      .eq('parent_id', parentId)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar submenus: ${error.message}`);
    }

    return data || [];
  }

  // Configurar menus visíveis para um role
  static async configurarMenusRole(dados: RoleMenusDTO): Promise<void> {
    const { role_id, menus } = dados;

    // Verificar se role existe
    const { data: role, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('id', role_id)
      .single();

    if (roleError || !role) {
      throw new Error('Role especificado não existe');
    }

    // Remover configurações existentes
    const { error: errorDelete } = await supabaseAdmin
      .from('role_menus')
      .delete()
      .eq('role_id', role_id);

    if (errorDelete) {
      throw new Error(`Erro ao remover configurações existentes: ${errorDelete.message}`);
    }

    // Inserir novas configurações
    if (menus.length > 0) {
      const novasConfiguracoes = menus.map(m => ({
        role_id,
        menu_id: m.menu_id,
        visivel: m.visivel
      }));

      const { error: errorInsert } = await supabaseAdmin
        .from('role_menus')
        .insert(novasConfiguracoes);

      if (errorInsert) {
        throw new Error(`Erro ao configurar menus: ${errorInsert.message}`);
      }
    }
  }

  // Obter configuração de menus para um role
  static async obterConfiguracaoRole(roleId: string): Promise<{
    menu_id: string;
    visivel: boolean;
    menu: Menu;
  }[]> {
    const { data, error } = await supabaseAdmin
      .from('role_menus')
      .select(`
        menu_id,
        visivel,
        menu:menus(*)
      `)
      .eq('role_id', roleId);

    if (error) {
      throw new Error(`Erro ao obter configuração de menus: ${error.message}`);
    }

    return data?.map(item => ({
      menu_id: item.menu_id,
      visivel: item.visivel,
      menu: Array.isArray(item.menu) ? item.menu[0] : item.menu
    })) || [];
  }

  // Obter estatísticas de menus
  static async obterEstatisticas(): Promise<{
    total: number;
    ativos: number;
    sistema: number;
    personalizados: number;
    principais: number;
    submenus: number;
    semUrl: number;
  }> {
    // Total de menus
    const { count: total, error: errorTotal } = await supabaseAdmin
      .from('menus')
      .select('*', { count: 'exact', head: true });

    if (errorTotal) {
      throw new Error(`Erro ao contar menus: ${errorTotal.message}`);
    }

    // Menus ativos
    const { count: ativos, error: errorAtivos } = await supabaseAdmin
      .from('menus')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    if (errorAtivos) {
      throw new Error(`Erro ao contar menus ativos: ${errorAtivos.message}`);
    }

    // Menus do sistema
    const { count: sistema, error: errorSistema } = await supabaseAdmin
      .from('menus')
      .select('*', { count: 'exact', head: true })
      .eq('sistema', true);

    if (errorSistema) {
      throw new Error(`Erro ao contar menus do sistema: ${errorSistema.message}`);
    }

    // Menus principais (sem parent)
    const { count: principais, error: errorPrincipais } = await supabaseAdmin
      .from('menus')
      .select('*', { count: 'exact', head: true })
      .is('parent_id', null);

    if (errorPrincipais) {
      throw new Error(`Erro ao contar menus principais: ${errorPrincipais.message}`);
    }

    // Submenus (com parent)
    const { count: submenus, error: errorSubmenus } = await supabaseAdmin
      .from('menus')
      .select('*', { count: 'exact', head: true })
      .not('parent_id', 'is', null);

    if (errorSubmenus) {
      throw new Error(`Erro ao contar submenus: ${errorSubmenus.message}`);
    }

    // Menus sem URL (separadores/grupos)
    const { count: semUrl, error: errorSemUrl } = await supabaseAdmin
      .from('menus')
      .select('*', { count: 'exact', head: true })
      .is('url', null);

    if (errorSemUrl) {
      throw new Error(`Erro ao contar menus sem URL: ${errorSemUrl.message}`);
    }

    return {
      total: total || 0,
      ativos: ativos || 0,
      sistema: sistema || 0,
      personalizados: (total || 0) - (sistema || 0),
      principais: principais || 0,
      submenus: submenus || 0,
      semUrl: semUrl || 0
    };
  }
} 