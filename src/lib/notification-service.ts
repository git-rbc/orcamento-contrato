import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface NotificacaoData {
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  dados?: Record<string, any>;
  expires_at?: string;
}

export interface NotificacaoPreferencias {
  email_reunioes: boolean;
  email_lembretes: boolean;
  email_alteracoes: boolean;
  notif_conflitos: boolean;
  notif_app: boolean;
  horario_relatorio: string;
}

export interface NotificacaoLog {
  usuario_id: string;
  tipo_envio: 'email' | 'in_app';
  tipo_notificacao: string;
  status: 'enviado' | 'falhado' | 'pendente';
  erro?: string;
  dados?: Record<string, any>;
}

class NotificationService {
  // Criar notificação para usuário específico
  async criarNotificacao(data: NotificacaoData): Promise<string | null> {
    try {
      const { data: notificacao, error } = await supabase
        .from('notificacoes')
        .insert([data])
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao criar notificação:', error);
        return null;
      }

      return notificacao.id;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }
  }

  // Buscar notificações do usuário
  async buscarNotificacoes(usuarioId: string, limit = 20, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Erro ao buscar notificações:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }
  }

  // Contar notificações não lidas
  async contarNaoLidas(usuarioId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId)
        .eq('lida', false);

      if (error) {
        console.error('Erro ao contar notificações não lidas:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      return 0;
    }
  }

  // Marcar notificação como lida
  async marcarComoLida(notificacaoId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ 
          lida: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificacaoId);

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return false;
    }
  }

  // Marcar todas as notificações como lidas
  async marcarTodasComoLidas(usuarioId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ 
          lida: true, 
          read_at: new Date().toISOString() 
        })
        .eq('usuario_id', usuarioId)
        .eq('lida', false);

      if (error) {
        console.error('Erro ao marcar todas como lidas:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      return false;
    }
  }

  // Deletar notificação
  async deletarNotificacao(notificacaoId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', notificacaoId);

      if (error) {
        console.error('Erro ao deletar notificação:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      return false;
    }
  }

  // Buscar preferências do usuário
  async buscarPreferencias(usuarioId: string): Promise<NotificacaoPreferencias | null> {
    try {
      const { data, error } = await supabase
        .from('notificacao_preferencias')
        .select('*')
        .eq('usuario_id', usuarioId)
        .single();

      if (error) {
        // Se não existe, criar com valores padrão
        if (error.code === 'PGRST116') {
          return await this.criarPreferenciasDefault(usuarioId);
        }
        console.error('Erro ao buscar preferências:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar preferências:', error);
      return null;
    }
  }

  // Criar preferências padrão
  async criarPreferenciasDefault(usuarioId: string): Promise<NotificacaoPreferencias | null> {
    try {
      const defaultPrefs: NotificacaoPreferencias = {
        email_reunioes: true,
        email_lembretes: true,
        email_alteracoes: true,
        notif_conflitos: true,
        notif_app: true,
        horario_relatorio: '08:00:00'
      };

      const { data, error } = await supabase
        .from('notificacao_preferencias')
        .insert([{ usuario_id: usuarioId, ...defaultPrefs }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar preferências default:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar preferências default:', error);
      return null;
    }
  }

  // Atualizar preferências
  async atualizarPreferencias(usuarioId: string, preferencias: Partial<NotificacaoPreferencias>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notificacao_preferencias')
        .upsert({ 
          usuario_id: usuarioId, 
          ...preferencias,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao atualizar preferências:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
      return false;
    }
  }

  // Registrar log de notificação
  async registrarLog(log: NotificacaoLog): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notificacao_log')
        .insert([log]);

      if (error) {
        console.error('Erro ao registrar log:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao registrar log:', error);
      return false;
    }
  }

  // Limpar notificações antigas (mais de 30 dias)
  async limparNotificacoes(): Promise<boolean> {
    try {
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() - 30);

      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .lt('created_at', dateLimite.toISOString());

      if (error) {
        console.error('Erro ao limpar notificações antigas:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao limpar notificações antigas:', error);
      return false;
    }
  }

  // Métodos específicos para tipos de notificação

  // Notificação de reunião agendada
  async notificarReuniaoAgendada(
    clienteId: string, 
    vendedorId: string, 
    dadosReuniao: any
  ): Promise<boolean> {
    try {
      // Notificação para cliente
      await this.criarNotificacao({
        usuario_id: clienteId,
        tipo: 'reuniao_agendada',
        titulo: 'Reunião Agendada',
        mensagem: `Sua reunião foi agendada para ${dadosReuniao.data} às ${dadosReuniao.hora_inicio}`,
        dados: dadosReuniao
      });

      // Notificação para vendedor
      await this.criarNotificacao({
        usuario_id: vendedorId,
        tipo: 'nova_reuniao',
        titulo: 'Nova Reunião na Agenda',
        mensagem: `Nova reunião agendada com ${dadosReuniao.cliente_nome} para ${dadosReuniao.data}`,
        dados: dadosReuniao
      });

      return true;
    } catch (error) {
      console.error('Erro ao notificar reunião agendada:', error);
      return false;
    }
  }

  // Notificação de conflito de agenda
  async notificarConflito(
    vendedorId: string, 
    adminIds: string[], 
    dadosConflito: any
  ): Promise<boolean> {
    try {
      // Notificar vendedor
      await this.criarNotificacao({
        usuario_id: vendedorId,
        tipo: 'conflito_agenda',
        titulo: 'Conflito de Agenda Detectado',
        mensagem: `Há um conflito em sua agenda para ${dadosConflito.data}`,
        dados: dadosConflito
      });

      // Notificar administradores
      for (const adminId of adminIds) {
        await this.criarNotificacao({
          usuario_id: adminId,
          tipo: 'conflito_critico',
          titulo: 'Conflito Crítico de Agenda',
          mensagem: `Conflito detectado na agenda do vendedor ${dadosConflito.vendedor_nome}`,
          dados: dadosConflito
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao notificar conflito:', error);
      return false;
    }
  }

  // Notificação de lembrete
  async notificarLembrete(
    usuarioId: string, 
    dadosReuniao: any, 
    horasAntecedencia: number
  ): Promise<boolean> {
    try {
      const tempo = horasAntecedencia === 24 ? '24 horas' : `${horasAntecedencia} horas`;
      
      await this.criarNotificacao({
        usuario_id: usuarioId,
        tipo: 'lembrete_reuniao',
        titulo: `Lembrete: Reunião em ${tempo}`,
        mensagem: `Sua reunião está marcada para ${dadosReuniao.data} às ${dadosReuniao.hora_inicio}`,
        dados: { ...dadosReuniao, horas_antecedencia: horasAntecedencia }
      });

      return true;
    } catch (error) {
      console.error('Erro ao notificar lembrete:', error);
      return false;
    }
  }

  // Verificar se usuário deve receber notificação
  async deveReceberNotificacao(
    usuarioId: string, 
    tipoNotificacao: string
  ): Promise<boolean> {
    try {
      const preferencias = await this.buscarPreferencias(usuarioId);
      if (!preferencias) return true; // Se não tem preferências, recebe todas

      switch (tipoNotificacao) {
        case 'reuniao_agendada':
        case 'nova_reuniao':
          return preferencias.notif_app;
        case 'lembrete_reuniao':
          return preferencias.email_lembretes && preferencias.notif_app;
        case 'conflito_agenda':
        case 'conflito_critico':
          return preferencias.notif_conflitos;
        default:
          return true;
      }
    } catch (error) {
      console.error('Erro ao verificar preferências:', error);
      return true;
    }
  }
}

export const notificationService = new NotificationService();