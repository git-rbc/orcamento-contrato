import { Cliente, CreateClienteDTO, UpdateClienteDTO, ClienteFilters, PaginatedResponse } from '@/types/database';
import { validateCPFCNPJ } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { ClienteService } from './clientes';

// Cache em memória para consultas frequentes (para Edge Runtime)
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// TTL padrão de 5 minutos
const DEFAULT_TTL = 5 * 60 * 1000;

// Função helper para cache
function getCacheKey(operation: string, params: any): string {
  return `${operation}:${JSON.stringify(params)}`;
}

function getFromCache<T>(key: string): T | null {
  const cached = queryCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    queryCache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

function setCache(key: string, data: any, ttl: number = DEFAULT_TTL): void {
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

// Função para invalidar cache relacionado
function invalidateRelatedCache(pattern: string): void {
  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
}

const getSupabaseAdmin = () => createSupabaseAdminClient();

export class ClienteServiceOptimized {
  
  // Listar clientes com cache inteligente
  static async listar(
    filters: ClienteFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Cliente>> {
    // Gerar chave de cache baseada nos filtros
    const cacheKey = getCacheKey('listar', { filters, page, limit });
    
    // Tentar recuperar do cache
    const cached = getFromCache<PaginatedResponse<Cliente>>(cacheKey);
    if (cached) {
      return cached;
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Query base otimizada
    let query = supabaseAdmin
      .from('clientes')
      .select('*', { count: 'exact' });

    // Aplicar filtros de forma otimizada
    const conditions: string[] = [];
    const params: any = {};

    if (filters.nome) {
      const cleanTerm = filters.nome.replace(/\D/g, '');
      if (cleanTerm.length >= 11 && (cleanTerm.length === 11 || cleanTerm.length === 14)) {
        // Busca otimizada com OR
        conditions.push(`(nome.ilike.%${filters.nome}% OR cpf_cnpj.ilike.%${cleanTerm}%)`);
      } else {
        conditions.push(`nome.ilike.%${filters.nome}%`);
      }
    }
    
    if (filters.cpf_cnpj) {
      const cleanCpfCnpj = filters.cpf_cnpj.replace(/\D/g, '');
      conditions.push(`cpf_cnpj.ilike.%${cleanCpfCnpj}%`);
    }
    
    if (filters.email) {
      conditions.push(`email.ilike.%${filters.email}%`);
    }
    
    if (filters.cidade) {
      conditions.push(`cidade.ilike.%${filters.cidade}%`);
    }
    
    if (filters.ativo !== undefined) {
      query = query.eq('ativo', filters.ativo);
    }

    // Aplicar filtro de tipo de pessoa usando índice otimizado
    if (filters.tipo_pessoa) {
      if (filters.tipo_pessoa === 'pessoa_fisica') {
        query = query.eq('length(cpf_cnpj)', 11);
      } else if (filters.tipo_pessoa === 'empresa') {
        query = query.eq('length(cpf_cnpj)', 14);
      }
    }

    // Aplicar todas as condições de uma vez
    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }

    // Paginação e ordenação
    const offset = (page - 1) * limit;
    query = query
      .range(offset, offset + limit - 1)
      .order('nome', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao listar clientes: ${error.message}`);
    }

    const result = {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };

    // Cache por 2 minutos para listas
    setCache(cacheKey, result, 2 * 60 * 1000);

    return result;
  }

  // Buscar múltiplos clientes por IDs (evita N+1 queries)
  static async buscarPorIds(ids: string[]): Promise<Cliente[]> {
    if (ids.length === 0) return [];

    const cacheKey = getCacheKey('buscarPorIds', { ids: ids.sort() });
    const cached = getFromCache<Cliente[]>(cacheKey);
    if (cached) return cached;

    const supabaseAdmin = getSupabaseAdmin();
    
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('*')
      .in('id', ids);

    if (error) {
      throw new Error(`Erro ao buscar clientes: ${error.message}`);
    }

    // Cache individual para cada cliente
    data?.forEach(cliente => {
      const individualKey = getCacheKey('buscarPorId', { id: cliente.id });
      setCache(individualKey, cliente, 10 * 60 * 1000);
    });

    // Cache da consulta em lote
    setCache(cacheKey, data || [], 5 * 60 * 1000);

    return data || [];
  }

  // Buscar cliente por ID com cache otimizado
  static async buscarPorId(id: string): Promise<Cliente | null> {
    const cacheKey = getCacheKey('buscarPorId', { id });
    const cached = getFromCache<Cliente | null>(cacheKey);
    if (cached !== null) return cached;

    const supabaseAdmin = getSupabaseAdmin();
    
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        setCache(cacheKey, null, 60 * 1000); // Cache "não encontrado" por 1 minuto
        return null;
      }
      throw new Error(`Erro ao buscar cliente: ${error.message}`);
    }

    // Cache por 10 minutos para detalhes específicos
    setCache(cacheKey, data, 10 * 60 * 1000);
    return data;
  }

  // Busca otimizada para select/autocomplete com debounce
  static async buscarParaSelect(termo: string = '', limite: number = 10): Promise<Pick<Cliente, 'id' | 'nome' | 'cpf_cnpj'>[]> {
    // Para autocomplete, cache mais agressivo
    const cacheKey = getCacheKey('buscarParaSelect', { termo, limite });
    const cached = getFromCache<Pick<Cliente, 'id' | 'nome' | 'cpf_cnpj'>[]>(cacheKey);
    if (cached) return cached;

    const supabaseAdmin = getSupabaseAdmin();
    
    let query = supabaseAdmin
      .from('clientes')
      .select('id, nome, cpf_cnpj')
      .eq('ativo', true)
      .limit(limite);

    if (termo.trim()) {
      const cleanTerm = termo.replace(/\D/g, '');
      if (cleanTerm.length >= 8) {
        // Use índice GIN para busca textual
        query = query.textSearch('nome', termo, { 
          type: 'websearch',
          config: 'portuguese'
        });
      } else {
        query = query.ilike('nome', `%${termo}%`);
      }
    }

    // Usar índice para ordenação otimizada
    query = query.order('nome', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar clientes: ${error.message}`);
    }

    // Cache mais longo para autocomplete
    setCache(cacheKey, data || [], 10 * 60 * 1000);
    return data || [];
  }

  // Estatísticas com cache muito longo
  static async obterEstatisticas(): Promise<{
    total: number;
    ativos: number;
    inativos: number;
    pessoas_fisicas: number;
    empresas: number;
    comContratos: number;
  }> {
    const cacheKey = getCacheKey('obterEstatisticas', {});
    const cached = getFromCache<any>(cacheKey);
    if (cached) return cached;

    const supabaseAdmin = getSupabaseAdmin();
    
    // Usar query única para todas as estatísticas
    const { data, error } = await supabaseAdmin.rpc('get_clientes_stats');

    if (error) {
      // Fallback para queries individuais se RPC não existir
      return this.obterEstatisticasFallback();
    }

    // Cache por 15 minutos para estatísticas
    setCache(cacheKey, data, 15 * 60 * 1000);
    return data;
  }

  // Fallback para estatísticas (método atual)
  private static async obterEstatisticasFallback() {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Executar queries em paralelo para reduzir tempo total
    const [
      totalResult,
      ativosResult,
      clientesDocsResult,
      contratosResult
    ] = await Promise.all([
      supabaseAdmin.from('clientes').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('clientes').select('*', { count: 'exact', head: true }).eq('ativo', true),
      supabaseAdmin.from('clientes').select('cpf_cnpj').eq('ativo', true),
      supabaseAdmin.from('contratos').select('cliente_id').not('cliente_id', 'is', null)
    ]);

    // Processar resultados
    let pessoas_fisicas = 0;
    let empresas = 0;

    clientesDocsResult.data?.forEach(cliente => {
      const doc = cliente.cpf_cnpj.replace(/\D/g, '');
      if (doc.length === 11) {
        pessoas_fisicas++;
      } else if (doc.length === 14) {
        empresas++;
      }
    });

    const clientesUnicos = new Set(contratosResult.data?.map(c => c.cliente_id) || []);

    const result = {
      total: totalResult.count || 0,
      ativos: ativosResult.count || 0,
      inativos: (totalResult.count || 0) - (ativosResult.count || 0),
      pessoas_fisicas,
      empresas,
      comContratos: clientesUnicos.size
    };

    // Cache por 15 minutos
    const cacheKey = getCacheKey('obterEstatisticas', {});
    setCache(cacheKey, result, 15 * 60 * 1000);

    return result;
  }

  // Criar cliente com invalidação de cache
  static async criar(dadosCliente: CreateClienteDTO): Promise<Cliente> {
    // Validações existentes...
    const resultado = await ClienteService.criar(dadosCliente);
    
    // Invalidar caches relacionados
    invalidateRelatedCache('listar');
    invalidateRelatedCache('obterEstatisticas');
    invalidateRelatedCache('buscarParaSelect');
    
    return resultado;
  }

  // Atualizar cliente com cache inteligente
  static async atualizar(id: string, dadosCliente: UpdateClienteDTO): Promise<Cliente> {
    const resultado = await ClienteService.atualizar(id, dadosCliente);
    
    // Invalidar caches específicos
    invalidateRelatedCache('listar');
    invalidateRelatedCache('obterEstatisticas');
    invalidateRelatedCache('buscarParaSelect');
    
    // Atualizar cache do cliente específico
    const cacheKey = getCacheKey('buscarPorId', { id });
    setCache(cacheKey, resultado, 10 * 60 * 1000);
    
    return resultado;
  }

  // Limpar cache manualmente (útil para desenvolvimento)
  static clearCache(): void {
    queryCache.clear();
  }

  // Obter estatísticas do cache
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: queryCache.size,
      keys: Array.from(queryCache.keys())
    };
  }
}

// Função auxiliar para criar stored procedure de estatísticas
export const createStatsFunction = `
CREATE OR REPLACE FUNCTION get_clientes_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', (SELECT COUNT(*) FROM clientes),
    'ativos', (SELECT COUNT(*) FROM clientes WHERE ativo = true),
    'inativos', (SELECT COUNT(*) FROM clientes WHERE ativo = false),
    'pessoas_fisicas', (SELECT COUNT(*) FROM clientes WHERE length(cpf_cnpj) = 11 AND ativo = true),
    'empresas', (SELECT COUNT(*) FROM clientes WHERE length(cpf_cnpj) = 14 AND ativo = true),
    'comContratos', (SELECT COUNT(DISTINCT cliente_id) FROM contratos WHERE cliente_id IS NOT NULL)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
`; 