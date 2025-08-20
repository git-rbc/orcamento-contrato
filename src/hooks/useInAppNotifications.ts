import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface Notificacao {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  dados: Record<string, any>;
  lida: boolean;
  created_at: string;
  read_at?: string;
  expires_at?: string;
}

interface NotificacaoPreferencias {
  email_reunioes: boolean;
  email_lembretes: boolean;
  email_alteracoes: boolean;
  notif_conflitos: boolean;
  notif_app: boolean;
  horario_relatorio: string;
}

interface UseNotificationsReturn {
  notificacoes: Notificacao[];
  countNaoLidas: number;
  loading: boolean;
  error: string | null;
  preferencias: NotificacaoPreferencias | null;
  
  // Funções de notificações
  carregarNotificacoes: () => Promise<void>;
  marcarComoLida: (id: string) => Promise<boolean>;
  marcarTodasComoLidas: () => Promise<boolean>;
  deletarNotificacao: (id: string) => Promise<boolean>;
  atualizarContador: () => Promise<void>;
  
  // Funções de preferências
  carregarPreferencias: () => Promise<void>;
  atualizarPreferencias: (novasPreferencias: Partial<NotificacaoPreferencias>) => Promise<boolean>;
}

export function useInAppNotifications(): UseNotificationsReturn {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [countNaoLidas, setCountNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferencias, setPreferencias] = useState<NotificacaoPreferencias | null>(null);

  // Carregar notificações
  const carregarNotificacoes = useCallback(async (limit = 20, offset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/notificacoes?limit=${limit}&offset=${offset}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar notificações');
      }

      if (data.success) {
        setNotificacoes(data.data || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar contador de não lidas
  const atualizarContador = useCallback(async () => {
    try {
      const response = await fetch('/api/notificacoes?nao_lidas=true');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar contador');
      }

      if (data.success) {
        setCountNaoLidas(data.count || 0);
      }
    } catch (err) {
      console.error('Erro ao atualizar contador:', err);
    }
  }, []);

  // Marcar notificação como lida
  const marcarComoLida = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notificacoes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ acao: 'marcar_lida' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao marcar como lida');
      }

      if (data.success) {
        // Atualizar estado local
        setNotificacoes(prev => prev.map(notif => 
          notif.id === id 
            ? { ...notif, lida: true, read_at: new Date().toISOString() }
            : notif
        ));
        
        // Atualizar contador
        setCountNaoLidas(prev => Math.max(0, prev - 1));
        
        return true;
      }

      return false;
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
      toast.error('Erro ao marcar notificação como lida');
      return false;
    }
  }, []);

  // Marcar todas como lidas
  const marcarTodasComoLidas = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/notificacoes/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ todas: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao marcar todas como lidas');
      }

      if (data.success) {
        // Atualizar estado local
        setNotificacoes(prev => prev.map(notif => ({
          ...notif,
          lida: true,
          read_at: new Date().toISOString()
        })));
        
        // Zerar contador
        setCountNaoLidas(0);
        
        toast.success('Todas as notificações foram marcadas como lidas');
        return true;
      }

      return false;
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
      toast.error('Erro ao marcar todas as notificações como lidas');
      return false;
    }
  }, []);

  // Deletar notificação
  const deletarNotificacao = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notificacoes/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao deletar notificação');
      }

      if (data.success) {
        // Atualizar estado local
        const notificacaoRemovida = notificacoes.find(n => n.id === id);
        setNotificacoes(prev => prev.filter(notif => notif.id !== id));
        
        // Atualizar contador se era não lida
        if (notificacaoRemovida && !notificacaoRemovida.lida) {
          setCountNaoLidas(prev => Math.max(0, prev - 1));
        }
        
        toast.success('Notificação removida');
        return true;
      }

      return false;
    } catch (err) {
      console.error('Erro ao deletar notificação:', err);
      toast.error('Erro ao remover notificação');
      return false;
    }
  }, [notificacoes]);

  // Carregar preferências
  const carregarPreferencias = useCallback(async () => {
    try {
      const response = await fetch('/api/notificacoes/preferencias');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar preferências');
      }

      if (data.success) {
        setPreferencias(data.data);
      }
    } catch (err) {
      console.error('Erro ao carregar preferências:', err);
    }
  }, []);

  // Atualizar preferências
  const atualizarPreferencias = useCallback(async (
    novasPreferencias: Partial<NotificacaoPreferencias>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/notificacoes/preferencias', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(novasPreferencias),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar preferências');
      }

      if (data.success) {
        setPreferencias(data.data);
        toast.success('Preferências atualizadas com sucesso');
        return true;
      }

      return false;
    } catch (err) {
      console.error('Erro ao atualizar preferências:', err);
      toast.error('Erro ao atualizar preferências');
      return false;
    }
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    carregarNotificacoes();
    atualizarContador();
    carregarPreferencias();
  }, [carregarNotificacoes, atualizarContador, carregarPreferencias]);

  // Polling para atualizar contador a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      atualizarContador();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [atualizarContador]);

  return {
    notificacoes,
    countNaoLidas,
    loading,
    error,
    preferencias,
    carregarNotificacoes,
    marcarComoLida,
    marcarTodasComoLidas,
    deletarNotificacao,
    atualizarContador,
    carregarPreferencias,
    atualizarPreferencias,
  };
}