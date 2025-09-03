import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

export interface Reuniao {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  espaco_evento_id?: string;
  tipo_reuniao_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  titulo: string;
  descricao?: string;
  observacoes?: string;
  link_reuniao?: string;
  tipo_link?: string;
  status: string;
  confirmada_cliente: boolean;
  confirmada_vendedor: boolean;
  lembrete_enviado: boolean;
  created_at: string;
  updated_at: string;
  
  // Novos campos da Fase 4
  pre_vendedor_id?: string;
  resumo_reuniao?: string;
  local_atendimento?: string;
  cor_agenda?: string;
  cupom_desconto_id?: string;
  data_entrada_lead?: string;
  reserva_temporaria_id?: string;
  
  // Campos das views/joins
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  cliente_origem?: string;
  cliente_campanha?: string;
  vendedor_nome?: string;
  vendedor_email?: string;
  tipo_reuniao_nome?: string;
  tipo_reuniao_cor?: string;
  espaco_nome?: string;
  espaco_cidade?: string;
  pre_vendedor_nome?: string;
  local_atendimento_nome?: string;
  local_atendimento_cor?: string;
}

export interface ReuniaoFilters {
  vendedorId?: string;
  clienteId?: string;
  status?: string;
  tipoReuniaoId?: string;
  dataInicio?: string;
  dataFim?: string;
  search?: string;
  // Novos filtros da Fase 4
  preVendedorId?: string;
  localAtendimento?: string;
  origem?: string;
  campanha?: string;
  confirmada?: boolean;
  espacoSalaId?: string;
}

export interface TipoReuniao {
  id: string;
  nome: string;
  descricao?: string;
  duracao_padrao_minutos: number;
  cor: string;
  ativo: boolean;
}

export interface DisponibilidadeCheck {
  disponivel: boolean;
  tem_disponibilidade_cadastrada: boolean;
  tem_conflitos: boolean;
  tem_bloqueios: boolean;
  conflitos: {
    reunioes: any[];
    bloqueios: any[];
  };
  horarios_disponiveis: {
    hora_inicio: string;
    hora_fim: string;
    duracao_minutos: number;
  }[];
}

// Novas interfaces da Fase 4
export interface VendedorPerformance {
  id: string;
  vendedor_id: string;
  periodo: string;
  total_reunioes: number;
  total_contratos: number;
  taxa_conversao: number;
  ranking_geral: number;
  ranking_online: number;
  ranking_presencial: number;
  ranking_10_dias: number;
  created_at: string;
  updated_at: string;
  // Campos de join
  vendedor_nome?: string;
  vendedor_email?: string;
}

export interface ReuniaoResultado {
  id: string;
  reuniao_id: string;
  resultado: 'sucesso' | 'reagendamento' | 'cancelamento' | 'conversao' | 'sem_interesse' | 'follow_up' | 'proposta_enviada';
  valor_estimado_negocio: number;
  proximos_passos?: string;
  data_follow_up?: string;
  observacoes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Campos de join
  reuniao_titulo?: string;
  cliente_nome?: string;
  created_by_nome?: string;
}

export interface LocalAtendimento {
  id: string;
  nome: string;
  codigo: string;
  cor: string;
  tipo: 'virtual' | 'presencial' | 'treinamento';
  cidade?: string;
  endereco?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EspacoSala {
  id: string;
  local_id: string;
  nome: string;
  capacidade: number;
  tipo: 'sala_reuniao' | 'espaco_evento' | 'sala_virtual' | 'auditorio' | 'sala_treinamento';
  equipamentos: any;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Campos de join
  local_nome?: string;
  local_cidade?: string;
  local_cor?: string;
}

export interface FormularioReuniao {
  id: string;
  reuniao_id: string;
  tipo: 'pre_meeting' | 'post_meeting' | 'feedback' | 'avaliacao_cliente' | 'follow_up';
  preenchido_por: string;
  dados: any;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Campos de join
  reuniao_titulo?: string;
  cliente_nome?: string;
  preenchido_por_nome?: string;
}

export function useReunioes() {
  const [reunioes, setReuniones] = useState<Reuniao[]>([]);
  const [tiposReuniao, setTiposReuniao] = useState<TipoReuniao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Buscar reuniões com filtros
  const fetchReuniones = useCallback(async (filters: ReuniaoFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.dataInicio) params.append('data_inicio', filters.dataInicio);
      if (filters.dataFim) params.append('data_fim', filters.dataFim);
      if (filters.vendedorId) params.append('vendedor_id', filters.vendedorId);
      if (filters.clienteId) params.append('cliente_id', filters.clienteId);
      if (filters.status) params.append('status', filters.status);
      if (filters.tipoReuniaoId) params.append('tipo_reuniao_id', filters.tipoReuniaoId);

      const response = await fetch(`/api/reunioes?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar reuniões');
      }

      const { data } = await response.json();
      
      let reunioesFiltradas = data || [];
      
      // Filtro de busca local
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        reunioesFiltradas = reunioesFiltradas.filter((reuniao: Reuniao) =>
          reuniao.titulo.toLowerCase().includes(searchLower) ||
          reuniao.cliente_nome?.toLowerCase().includes(searchLower) ||
          reuniao.vendedor_nome?.toLowerCase().includes(searchLower) ||
          reuniao.tipo_reuniao_nome?.toLowerCase().includes(searchLower)
        );
      }
      
      setReuniones(reunioesFiltradas);
    } catch (err) {
      console.error('Erro ao buscar reuniões:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar tipos de reunião
  const fetchTiposReuniao = useCallback(async () => {
    try {
      const response = await fetch('/api/reunioes/tipos');
      const { data } = await response.json();
      setTiposReuniao(data || []);
    } catch (err) {
      console.error('Erro ao buscar tipos de reunião:', err);
    }
  }, []);

  // Criar nova reunião
  const createReuniao = useCallback(async (dadosReuniao: Partial<Reuniao>) => {
    try {
      const response = await fetch('/api/reunioes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosReuniao)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar reunião');
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      console.error('Erro ao criar reunião:', err);
      throw err;
    }
  }, []);

  // Atualizar reunião
  const updateReuniao = useCallback(async (id: string, updates: Partial<Reuniao>) => {
    try {
      const response = await fetch('/api/reunioes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar reunião');
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      console.error('Erro ao atualizar reunião:', err);
      throw err;
    }
  }, []);

  // Cancelar reunião
  const cancelReuniao = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/reunioes?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao cancelar reunião');
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      console.error('Erro ao cancelar reunião:', err);
      throw err;
    }
  }, []);

  // Confirmar reunião
  const confirmarReuniao = useCallback(async (id: string, tipo: 'cliente' | 'vendedor') => {
    try {
      const response = await fetch(`/api/reunioes/${id}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_confirmacao: tipo })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao confirmar reunião');
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      console.error('Erro ao confirmar reunião:', err);
      throw err;
    }
  }, []);

  // Reagendar reunião
  const reagendarReuniao = useCallback(async (
    id: string, 
    novaData: string, 
    novaHoraInicio: string, 
    novaHoraFim: string,
    motivo?: string
  ) => {
    try {
      const response = await fetch(`/api/reunioes/${id}/reagendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nova_data: novaData,
          nova_hora_inicio: novaHoraInicio,
          nova_hora_fim: novaHoraFim,
          motivo
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao reagendar reunião');
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      console.error('Erro ao reagendar reunião:', err);
      throw err;
    }
  }, []);

  // Verificar disponibilidade
  const checkDisponibilidade = useCallback(async (
    vendedorId: string,
    data: string,
    horaInicio: string,
    horaFim: string,
    excludeReuniaoId?: string
  ): Promise<DisponibilidadeCheck> => {
    try {
      const response = await fetch('/api/vendedores/disponibilidade/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedor_id: vendedorId,
          data,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          excludeReuniaoId
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar disponibilidade');
      }

      const { data: result } = await response.json();
      return result;
    } catch (err) {
      console.error('Erro ao verificar disponibilidade:', err);
      throw err;
    }
  }, []);

  // Enviar email
  const enviarEmail = useCallback(async (
    id: string, 
    tipo: 'agendada' | 'lembrete' | 'cancelada' | 'reagendada',
    opcoes?: { notificarVendedor?: boolean; horasAntecedencia?: number; motivo?: string }
  ) => {
    try {
      const response = await fetch(`/api/reunioes/${id}/enviar-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_email: tipo,
          opcoes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar email');
      }

      return true;
    } catch (err) {
      console.error('Erro ao enviar email:', err);
      throw err;
    }
  }, []);

  // Buscar estatísticas
  const fetchStats = useCallback(async (filters: ReuniaoFilters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.dataInicio) params.append('data_inicio', filters.dataInicio);
      if (filters.dataFim) params.append('data_fim', filters.dataFim);
      if (filters.vendedorId) params.append('vendedor_id', filters.vendedorId);

      const response = await fetch(`/api/reunioes/stats?${params.toString()}`);
      const { data } = await response.json();
      return data;
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
      throw err;
    }
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    fetchTiposReuniao();
  }, [fetchTiposReuniao]);

  return {
    // Estado
    reunioes,
    tiposReuniao,
    loading,
    error,

    // Ações
    fetchReuniones,
    fetchTiposReuniao,
    createReuniao,
    updateReuniao,
    cancelReuniao,
    confirmarReuniao,
    reagendarReuniao,
    checkDisponibilidade,
    enviarEmail,
    fetchStats,

    // Utilitários
    refreshData: () => fetchReuniones(),
    clearError: () => setError(null)
  };
}