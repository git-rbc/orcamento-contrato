import { createClient } from '@supabase/supabase-js';
import { Permissao, PaginatedResponse } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Supabase com service role para operações do servidor
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export class PermissionService {
  // Listar todas as permissões
  static async listar(
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<Permissao>> {
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await supabaseAdmin
      .from('permissoes')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('modulo', { ascending: true })
      .order('acao', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar permissões: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  // Listar permissões agrupadas por módulo
  static async listarPorModulo(): Promise<Record<string, Permissao[]>> {
    const { data, error } = await supabaseAdmin
      .from('permissoes')
      .select('*')
      .order('modulo', { ascending: true })
      .order('acao', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar permissões: ${error.message}`);
    }

    // Agrupar por módulo
    const permissoesPorModulo: Record<string, Permissao[]> = {};
    
    data?.forEach(permissao => {
      if (!permissoesPorModulo[permissao.modulo]) {
        permissoesPorModulo[permissao.modulo] = [];
      }
      permissoesPorModulo[permissao.modulo].push(permissao);
    });

    return permissoesPorModulo;
  }

  // Buscar permissão por ID
  static async buscarPorId(id: string): Promise<Permissao | null> {
    const { data, error } = await supabaseAdmin
      .from('permissoes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar permissão: ${error.message}`);
    }

    return data;
  }

  // Buscar permissão por módulo e ação
  static async buscarPorModuloAcao(modulo: string, acao: string): Promise<Permissao | null> {
    const { data, error } = await supabaseAdmin
      .from('permissoes')
      .select('*')
      .eq('modulo', modulo)
      .eq('acao', acao)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar permissão: ${error.message}`);
    }

    return data;
  }

  // Verificar se usuário tem permissão específica
  static async verificarPermissaoUsuario(
    userId: string, 
    modulo: string, 
    acao: string
  ): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .rpc('user_has_permission', {
        user_id: userId,
        modulo_param: modulo,
        acao_param: acao
      });

    if (error) {
      throw new Error(`Erro ao verificar permissão: ${error.message}`);
    }

    return data || false;
  }

  // Obter todas as permissões de um usuário
  static async obterPermissoesUsuario(userId: string): Promise<{
    modulo: string;
    acao: string;
    nome: string;
  }[]> {
    const { data, error } = await supabaseAdmin
      .rpc('get_user_permissions', {
        user_id: userId
      });

    if (error) {
      throw new Error(`Erro ao obter permissões do usuário: ${error.message}`);
    }

    return data || [];
  }

  // Obter permissões de um role específico
  static async obterPermissoesRole(roleId: string): Promise<{
    permissao: Permissao;
    concedida: boolean;
  }[]> {
    const { data, error } = await supabaseAdmin
      .from('role_permissoes')
      .select(`
        concedida,
        permissao:permissoes(*)
      `)
      .eq('role_id', roleId);

    if (error) {
      throw new Error(`Erro ao obter permissões do role: ${error.message}`);
    }

    return data?.map(item => ({
      permissao: item.permissao as unknown as Permissao,
      concedida: Boolean(item.concedida)
    })) || [];
  }

  // Listar módulos disponíveis
  static async listarModulos(): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('permissoes')
      .select('modulo')
      .order('modulo', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar módulos: ${error.message}`);
    }

    // Remover duplicatas
    const modulos = [...new Set(data?.map(item => item.modulo) || [])];
    return modulos;
  }

  // Listar ações disponíveis para um módulo
  static async listarAcoesModulo(modulo: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('permissoes')
      .select('acao')
      .eq('modulo', modulo)
      .order('acao', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar ações: ${error.message}`);
    }

    return data?.map(item => item.acao) || [];
  }

  // Obter estatísticas de permissões
  static async obterEstatisticas(): Promise<{
    totalPermissoes: number;
    totalModulos: number;
    moduloComMaisPermissoes: {
      modulo: string;
      quantidade: number;
    } | null;
    distribuicaoPorModulo: {
      modulo: string;
      quantidade: number;
    }[];
  }> {
    // Total de permissões
    const { count: totalPermissoes, error: errorTotal } = await supabaseAdmin
      .from('permissoes')
      .select('*', { count: 'exact', head: true });

    if (errorTotal) {
      throw new Error(`Erro ao contar permissões: ${errorTotal.message}`);
    }

    // Distribuição por módulo
    const { data: permissoes, error: errorPermissoes } = await supabaseAdmin
      .from('permissoes')
      .select('modulo');

    if (errorPermissoes) {
      throw new Error(`Erro ao buscar permissões: ${errorPermissoes.message}`);
    }

    // Contar por módulo
    const contadorModulos: Record<string, number> = {};
    permissoes?.forEach(p => {
      contadorModulos[p.modulo] = (contadorModulos[p.modulo] || 0) + 1;
    });

    const distribuicaoPorModulo = Object.entries(contadorModulos)
      .map(([modulo, quantidade]) => ({ modulo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);

    const moduloComMaisPermissoes = distribuicaoPorModulo[0] || null;

    return {
      totalPermissoes: totalPermissoes || 0,
      totalModulos: Object.keys(contadorModulos).length,
      moduloComMaisPermissoes,
      distribuicaoPorModulo
    };
  }

  // Criar uma nova permissão (caso seja necessário)
  static async criarPermissao(dados: {
    modulo: string;
    acao: string;
    nome: string;
    descricao?: string;
  }): Promise<Permissao> {
    // Verificar se já existe
    const existente = await this.buscarPorModuloAcao(dados.modulo, dados.acao);
    if (existente) {
      throw new Error('Já existe uma permissão com este módulo e ação');
    }

    const { data, error } = await supabaseAdmin
      .from('permissoes')
      .insert({
        modulo: dados.modulo.trim(),
        acao: dados.acao.trim(),
        nome: dados.nome.trim(),
        descricao: dados.descricao?.trim() || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar permissão: ${error.message}`);
    }

    return data;
  }

  // Verificar múltiplas permissões de uma vez
  static async verificarMultiplasPermissoes(
    userId: string,
    permissoes: { modulo: string; acao: string }[]
  ): Promise<Record<string, boolean>> {
    const resultados: Record<string, boolean> = {};

    // Fazer verificações em paralelo
    const verificacoes = permissoes.map(async ({ modulo, acao }) => {
      const chave = `${modulo}.${acao}`;
      const temPermissao = await this.verificarPermissaoUsuario(userId, modulo, acao);
      return { chave, temPermissao };
    });

    const respostas = await Promise.all(verificacoes);
    
    respostas.forEach(({ chave, temPermissao }) => {
      resultados[chave] = temPermissao;
    });

    return resultados;
  }

  // Helper para verificar se é super admin (tem todas as permissões)
  static async isSuperAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        role:roles(nome)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      return false;
    }

    return (data?.role as any)?.nome === 'Super Admin';
  }
} 