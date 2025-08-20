import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { format } from 'date-fns';
import type { Reserva, Bloqueio, EspacoEvento, Cliente, DisponibilidadeResponse } from '@/types/calendario';


interface CalendarioFilters {
  espacoId?: string;
  status?: string;
  clienteId?: string;
}

export function useCalendario() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [espacos, setEspacos] = useState<EspacoEvento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch espaços disponíveis
  const fetchEspacos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('espacos_eventos')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setEspacos(data || []);
    } catch (err) {
      console.error('Erro ao buscar espaços:', err);
      setError('Erro ao carregar espaços');
    }
  }, []);

  // Fetch clientes
  const fetchClientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, cpf_cnpj, telefone, email')
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      setError('Erro ao carregar clientes');
    }
  }, []);

  // Fetch reservas com filtros
  const fetchReservas = useCallback(async (
    startDate: Date,
    endDate: Date,
    filters: CalendarioFilters = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('reservas_espacos')
        .select(`
          *,
          cliente:clientes(nome, telefone, email),
          espaco:espacos_eventos(nome, capacidade_maxima),
          contrato:contratos(numero_contrato)
        `)
        .gte('data_inicio', format(startDate, 'yyyy-MM-dd'))
        .lte('data_fim', format(endDate, 'yyyy-MM-dd'));

      if (filters.espacoId && filters.espacoId !== 'todos') {
        query = query.eq('espaco_evento_id', filters.espacoId);
      }

      if (filters.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }

      if (filters.clienteId && filters.clienteId !== 'todos') {
        query = query.eq('cliente_id', filters.clienteId);
      }

      const { data, error } = await query.order('data_inicio', { ascending: true });

      if (error) throw error;
      setReservas(data || []);
    } catch (err) {
      console.error('Erro ao buscar reservas:', err);
      setError('Erro ao carregar reservas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch bloqueios
  const fetchBloqueios = useCallback(async (
    startDate: Date,
    endDate: Date,
    espacoId?: string
  ) => {
    try {
      let query = supabase
        .from('bloqueios_datas')
        .select(`
          *,
          espaco:espacos_eventos(nome)
        `)
        .gte('data_inicio', format(startDate, 'yyyy-MM-dd'))
        .lte('data_fim', format(endDate, 'yyyy-MM-dd'));

      if (espacoId) {
        query = query.eq('espaco_evento_id', espacoId);
      }

      const { data, error } = await query.order('data_inicio', { ascending: true });

      if (error) throw error;
      setBloqueios(data || []);
    } catch (err) {
      console.error('Erro ao buscar bloqueios:', err);
      setError('Erro ao carregar bloqueios');
    }
  }, []);

  // Criar reserva
  const createReserva = useCallback(async (reservaData: Partial<Reserva>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data, error } = await supabase
        .from('reservas_espacos')
        .insert({
          ...reservaData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao criar reserva:', err);
      throw err;
    }
  }, []);

  // Atualizar reserva
  const updateReserva = useCallback(async (id: string, updates: Partial<Reserva>) => {
    try {
      const { data, error } = await supabase
        .from('reservas_espacos')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao atualizar reserva:', err);
      throw err;
    }
  }, []);

  // Deletar reserva
  const deleteReserva = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('reservas_espacos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao deletar reserva:', err);
      throw err;
    }
  }, []);

  // Criar bloqueio
  const createBloqueio = useCallback(async (bloqueioData: Partial<Bloqueio>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('bloqueios_datas')
        .insert({
          ...bloqueioData,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao criar bloqueio:', err);
      throw err;
    }
  }, []);

  // Deletar bloqueio
  const deleteBloqueio = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('bloqueios_datas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao deletar bloqueio:', err);
      throw err;
    }
  }, []);

  // Verificar disponibilidade
  const checkDisponibilidade = useCallback(async (
    espacoId: string,
    dataInicio: Date,
    dataFim: Date,
    excludeId?: string
  ) => {
    try {
      // Verificar reservas conflitantes
      let reservasQuery = supabase
        .from('reservas_espacos')
        .select('id')
        .eq('espaco_evento_id', espacoId)
        .neq('status', 'cancelado')
        .or(`and(data_inicio.lte.${format(dataFim, 'yyyy-MM-dd')},data_fim.gte.${format(dataInicio, 'yyyy-MM-dd')})`);

      if (excludeId) {
        reservasQuery = reservasQuery.neq('id', excludeId);
      }

      const { data: reservasConflito, error: reservasError } = await reservasQuery;

      if (reservasError) throw reservasError;

      // Verificar bloqueios conflitantes
      const { data: bloqueiosConflito, error: bloqueiosError } = await supabase
        .from('bloqueios_datas')
        .select('id')
        .eq('espaco_evento_id', espacoId)
        .or(`and(data_inicio.lte.${format(dataFim, 'yyyy-MM-dd')},data_fim.gte.${format(dataInicio, 'yyyy-MM-dd')})`);

      if (bloqueiosError) throw bloqueiosError;

      const disponivel = (!reservasConflito || reservasConflito.length === 0) && 
                         (!bloqueiosConflito || bloqueiosConflito.length === 0);

      return {
        disponivel,
        conflitos: {
          reservas: reservasConflito?.length || 0,
          bloqueios: bloqueiosConflito?.length || 0
        }
      } as DisponibilidadeResponse;
    } catch (err) {
      console.error('Erro ao verificar disponibilidade:', err);
      throw err;
    }
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    fetchEspacos();
    fetchClientes();
  }, [fetchEspacos, fetchClientes]);

  return {
    reservas,
    bloqueios,
    espacos,
    clientes,
    loading,
    error,
    fetchReservas,
    fetchBloqueios,
    createReserva,
    updateReserva,
    deleteReserva,
    createBloqueio,
    deleteBloqueio,
    checkDisponibilidade,
    refreshData: () => {
      fetchEspacos();
      fetchClientes();
    }
  };
}