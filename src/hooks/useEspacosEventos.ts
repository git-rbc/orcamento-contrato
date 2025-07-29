import { useState, useEffect, useCallback, useMemo } from 'react';
import { EspacoEvento, EspacoEventoFilters, PaginatedResponse, CreateEspacoEventoDTO, UpdateEspacoEventoDTO } from '@/types/database';
import { toast } from 'sonner';

export function useEspacosEventos(filters?: EspacoEventoFilters) {
  const [espacos, setEspacos] = useState<EspacoEvento[]>([]);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoizar filtros para evitar re-criação desnecessária
  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);

  const fetchEspacos = useCallback(async (currentFilters?: EspacoEventoFilters) => {
    try {
      setLoading(true);
      setError(null);

      const queryFilters = currentFilters || memoizedFilters || {};
      const searchParams = new URLSearchParams();

      // Adicionar filtros à query
      Object.entries(queryFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/espacos-eventos?${searchParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar espaços');
      }

      const data: PaginatedResponse<EspacoEvento> = await response.json();
      setEspacos(data.data);
      setPaginationInfo({
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  const createEspaco = useCallback(async (data: CreateEspacoEventoDTO): Promise<EspacoEvento | null> => {
    try {
      const response = await fetch('/api/espacos-eventos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar espaço');
      }

      const result = await response.json();
      toast.success('Espaço criado com sucesso!');
      
      // Atualizar lista
      fetchEspacos();
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar espaço';
      toast.error(errorMessage);
      return null;
    }
  }, [fetchEspacos]);

  const updateEspaco = useCallback(async (id: string, data: Partial<UpdateEspacoEventoDTO>): Promise<EspacoEvento | null> => {
    try {
      const response = await fetch(`/api/espacos-eventos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar espaço');
      }

      const result = await response.json();
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar espaço';
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const deleteEspaco = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/espacos-eventos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir espaço');
      }

      toast.success('Espaço excluído com sucesso!');
      
      // Atualizar lista
      fetchEspacos();
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir espaço';
      toast.error(errorMessage);
      return false;
    }
  }, [fetchEspacos]);

  const getEspaco = useCallback(async (id: string): Promise<EspacoEvento | null> => {
    try {
      const response = await fetch(`/api/espacos-eventos/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar espaço');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar espaço';
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const toggleStatus = useCallback(async (id: string, ativo: boolean): Promise<boolean> => {
    const result = await updateEspaco(id, { ativo });
    return result !== null;
  }, [updateEspaco]);

  const duplicateEspaco = useCallback(async (id: string): Promise<EspacoEvento | null> => {
    const original = await getEspaco(id);
    if (!original) return null;

    const duplicateData: CreateEspacoEventoDTO = {
      nome: `${original.nome} (Cópia)`,
      cidade: original.cidade,
      capacidade_maxima: original.capacidade_maxima,
      descricao: original.descricao ?? '',
      tem_espaco_kids: original.tem_espaco_kids,
      tem_pista_led: original.tem_pista_led,
      tem_centro_better: original.tem_centro_better,
      tipo_cadeira: original.tipo_cadeira ?? '',
      tipo_decorativo: original.tipo_decorativo ?? '',
      ativo: false, // Criar como inativo por padrão
      ordem: original.ordem,
      cor: original.cor,
    };

    return await createEspaco(duplicateData);
  }, [getEspaco, createEspaco]);

  // Recarrega sempre que filtros forem alterados
  useEffect(() => {
    fetchEspacos();
  }, [fetchEspacos]);

  return {
    espacos,
    paginationInfo,
    loading,
    error,
    fetchEspacos,
    createEspaco,
    updateEspaco,
    deleteEspaco,
    getEspaco,
    toggleStatus,
    duplicateEspaco,
    refetch: fetchEspacos
  };
}

// Hook para estatísticas
export function useEspacosEventosStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/espacos-eventos/stats');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar estatísticas');
      }

      const data = await response.json();
      setStats(data.data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar estatísticas';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
} 