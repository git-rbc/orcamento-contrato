interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheManager {
  private static instance: CacheManager;
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 horas em ms

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Armazena um item no cache
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    try {
      const now = Date.now();
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: now,
        expiresAt: now + ttl
      };

      localStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Erro ao salvar no cache:', error);
    }
  }

  /**
   * Recupera um item do cache
   */
  get<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      const now = Date.now();

      // Verifica se o item expirou
      if (now > cacheItem.expiresAt) {
        this.delete(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.warn('Erro ao ler do cache:', error);
      return null;
    }
  }

  /**
   * Remove um item do cache
   */
  delete(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Erro ao remover do cache:', error);
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    try {
      // Remove apenas chaves que começam com 'dashboard-stats'
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('dashboard-stats')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Erro ao limpar cache:', error);
    }
  }

  /**
   * Verifica se um item existe no cache e não expirou
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Obtém informações sobre um item do cache
   */
  getInfo(key: string): { exists: boolean; expiresAt?: number; age?: number } {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return { exists: false };

      const cacheItem: CacheItem<any> = JSON.parse(cached);
      const now = Date.now();

      return {
        exists: true,
        expiresAt: cacheItem.expiresAt,
        age: now - cacheItem.timestamp
      };
    } catch (error) {
      return { exists: false };
    }
  }
}

// Singleton instance
export const cache = CacheManager.getInstance();

// Chaves do cache para o dashboard
export const CACHE_KEYS = {
  CLIENTES_STATS: 'dashboard-stats-clientes',
  PRODUTOS_STATS: 'dashboard-stats-produtos',
  SERVICOS_STATS: 'dashboard-stats-servicos',
} as const;

// Utility functions para uso específico do dashboard
export const dashboardCache = {
  getClientesStats: () => cache.get<{ total: number }>(CACHE_KEYS.CLIENTES_STATS),
  setClientesStats: (data: { total: number }) => cache.set(CACHE_KEYS.CLIENTES_STATS, data),
  
  getProdutosStats: () => cache.get<{ total: number }>(CACHE_KEYS.PRODUTOS_STATS),
  setProdutosStats: (data: { total: number }) => cache.set(CACHE_KEYS.PRODUTOS_STATS, data),

  getServicosStats: () => cache.get<{ total: number }>(CACHE_KEYS.SERVICOS_STATS),
  setServicosStats: (data: { total: number }) => cache.set(CACHE_KEYS.SERVICOS_STATS, data),
  
  clearAll: () => cache.clear(),
  
  getInfo: (key: string) => cache.getInfo(key)
};