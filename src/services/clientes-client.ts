import { Cliente, CreateClienteDTO, UpdateClienteDTO, ClienteFilters, PaginatedResponse } from '@/types/database';

// Service de clientes para o lado cliente (usa APIs REST)
export class ClienteClientService {
  static async listar(
    filters: ClienteFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Cliente>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      )
    });

    const url = `/api/clientes?${params.toString()}`;
    
    // Debug da URL construída
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 URL da requisição:', url);
      console.log('🔍 Filtros recebidos:', filters);
      console.log('🔍 Parâmetros da URL:', Object.fromEntries(params));
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro ao listar clientes: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Debug da resposta
    if (process.env.NODE_ENV === 'development') {
      console.log('📥 Resposta da API:', result);
    }

    return result;
  }

  static async buscarPorId(id: string): Promise<Cliente> {
    const response = await fetch(`/api/clientes/${id}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar cliente: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  static async criar(data: CreateClienteDTO): Promise<Cliente> {
    const response = await fetch('/api/clientes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar cliente');
    }

    const result = await response.json();
    return result.data;
  }

  static async atualizar(id: string, data: UpdateClienteDTO): Promise<Cliente> {
    const response = await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar cliente');
    }

    const result = await response.json();
    return result.data;
  }

  static async excluir(id: string): Promise<void> {
    const response = await fetch(`/api/clientes/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao excluir cliente');
    }
  }

  static async ativar(id: string): Promise<Cliente> {
    const response = await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ativo: true }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao ativar cliente');
    }

    const result = await response.json();
    return result.data;
  }

  static async desativar(id: string): Promise<Cliente> {
    const response = await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ativo: false }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao desativar cliente');
    }

    const result = await response.json();
    return result.data;
  }

  static async buscarParaSelect(termo: string = '', limite: number = 10): Promise<Cliente[]> {
    const params = new URLSearchParams({
      search: termo,
      limit: limite.toString(),
      select_mode: 'true'
    });

    const response = await fetch(`/api/clientes/search?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar clientes: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  static async obterEstatisticas(): Promise<{
    total: number;
    ativos: number;
    inativos: number;
    pessoas_fisicas: number;
    empresas: number;
    comContratos: number;
  }> {
    const response = await fetch('/api/clientes/stats');
    
    if (!response.ok) {
      throw new Error(`Erro ao obter estatísticas: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Garantir que sempre retorna um objeto válido
    const defaultStats = {
      total: 0,
      ativos: 0,
      inativos: 0,
      pessoas_fisicas: 0,
      empresas: 0,
      comContratos: 0
    };

    return result.data || defaultStats;
  }
}

// Adicionar cache in-memory para buscas de clientes (expira em 1h)
type CacheEntry<T> = { data: T; timestamp: number };
const clienteSearchCache: Map<string, CacheEntry<any>> = new Map();

// Função para buscar clientes no lado cliente para autocomplete
export async function buscarClientesParaSelect(termo: string = '', limite: number = 10) {
  try {
    const params = new URLSearchParams({
      q: termo,
      limit: limite.toString()
    });

    // ----- Cache ---------------------------------------------------------
    const cacheKey = params.toString();
    const cached = clienteSearchCache.get(cacheKey);
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    if (cached && now - cached.timestamp < ONE_HOUR) {
      return cached.data;
    }
    // ---------------------------------------------------------------------

    const response = await fetch(`/api/clientes/search?${params}`);
    
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Verificar se há erro na resposta
    if (data.error) {
      throw new Error(data.error);
    }
    
    const resultado = data.data || [];

    // Salvar em cache
    clienteSearchCache.set(cacheKey, { data: resultado, timestamp: now });

    return resultado;
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }
}

 