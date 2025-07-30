import { useCallback } from 'react';
import { dashboardCache, CACHE_KEYS } from '@/lib/cache';

export const useDashboardCache = () => {
  // Função para forçar atualização dos dados (sem reload para reduzir uso de CPU)
  const refreshStats = useCallback(async () => {
    try {
      // Limpar cache existente
      dashboardCache.clearAll();
      
      // Criar evento customizado para notificar componentes sobre atualização
      const event = new CustomEvent('dashboard-refresh');
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error);
    }
  }, []);

  // Função para invalidar cache específico
  const invalidateCache = useCallback((type: 'clientes' | 'produtos' | 'servicos' | 'all') => {
    switch (type) {
      case 'clientes':
        localStorage.removeItem(CACHE_KEYS.CLIENTES_STATS);
        break;
      case 'produtos':
        localStorage.removeItem(CACHE_KEYS.PRODUTOS_STATS);
        break;
      case 'servicos':
        localStorage.removeItem(CACHE_KEYS.SERVICOS_STATS);
        break;
      case 'all':
        dashboardCache.clearAll();
        break;
    }
  }, []);

  // Função para obter informações do cache
  const getCacheInfo = useCallback(() => {
    return {
      clientes: dashboardCache.getInfo(CACHE_KEYS.CLIENTES_STATS),
      produtos: dashboardCache.getInfo(CACHE_KEYS.PRODUTOS_STATS),
      servicos: dashboardCache.getInfo(CACHE_KEYS.SERVICOS_STATS),
    };
  }, []);

  // Função para verificar se há dados em cache
  const hasCachedData = useCallback(() => {
    return (
      dashboardCache.getClientesStats() !== null ||
      dashboardCache.getProdutosStats() !== null ||
      dashboardCache.getServicosStats() !== null
    );
  }, []);

  return {
    refreshStats,
    invalidateCache,
    getCacheInfo,
    hasCachedData,
  };
};