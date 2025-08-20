import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
import { notificationService } from '../notification-service';
import { conflictDetector } from '../conflict-detector';
// import { enviarEmailReuniao } from '@/services/email-reunioes';

export interface ReuniaoLembrete {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  vendedor_id: string;
  vendedor_nome: string;
  vendedor_email: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  titulo: string;
  tipo_reuniao: string;
  espaco_nome?: string;
  link_reuniao?: string;
  observacoes?: string;
  lembrete_enviado: boolean;
}

class NotificationScheduler {
  // Buscar reuniões que precisam de lembrete
  async buscarReunioesPendentesLembrete(horasAntecedencia: number): Promise<ReuniaoLembrete[]> {
    try {
      const agora = new Date();
      const dataLimite = new Date(agora.getTime() + horasAntecedencia * 60 * 60 * 1000);
      
      // Buscar reuniões nas próximas X horas que ainda não tiveram lembrete enviado
      const { data: reunioes, error } = await supabase
        .from('v_reunioes_completa')
        .select(`
          id,
          cliente_id,
          cliente_nome,
          cliente_email,
          vendedor_id,
          vendedor_nome,
          vendedor_email,
          data,
          hora_inicio,
          hora_fim,
          titulo,
          tipo_reuniao,
          espaco_nome,
          link_reuniao,
          observacoes,
          lembrete_enviado
        `)
        .eq('status', 'agendada')
        .eq('lembrete_enviado', false)
        .gte('data', agora.toISOString().split('T')[0])
        .lte('data', dataLimite.toISOString().split('T')[0]);

      if (error) {
        console.error('Erro ao buscar reuniões para lembrete:', error);
        return [];
      }

      if (!reunioes) return [];

      // Filtrar reuniões que estão no período correto de antecedência
      const reunioesFiltradas = reunioes.filter((reuniao: any) => {
        const dataHoraReuniao = new Date(`${reuniao.data}T${reuniao.hora_inicio}`);
        const tempoRestante = dataHoraReuniao.getTime() - agora.getTime();
        const horasRestantes = tempoRestante / (1000 * 60 * 60);
        
        // Verificar se está no período de envio (±30 minutos da antecedência desejada)
        return horasRestantes <= horasAntecedencia && horasRestantes >= horasAntecedencia - 0.5;
      });

      return reunioesFiltradas;

    } catch (error) {
      console.error('Erro ao buscar reuniões pendentes de lembrete:', error);
      return [];
    }
  }

  // Enviar lembretes automáticos
  async enviarLembretesAutomaticos(horasAntecedencia: number): Promise<void> {
    try {
      const reunioes = await this.buscarReunioesPendentesLembrete(horasAntecedencia);
      
      if (reunioes.length === 0) {
        console.log(`Nenhuma reunião encontrada para lembrete de ${horasAntecedencia}h`);
        return;
      }

      console.log(`Processando ${reunioes.length} lembretes de ${horasAntecedencia}h`);

      for (const reuniao of reunioes) {
        try {
          // Verificar preferências do cliente
          const deveReceberCliente = await notificationService.deveReceberNotificacao(
            reuniao.cliente_id,
            'lembrete_reuniao'
          );

          // Verificar preferências do vendedor
          const deveReceberVendedor = await notificationService.deveReceberNotificacao(
            reuniao.vendedor_id,
            'lembrete_reuniao'
          );

          // Enviar lembrete para cliente (notificação in-app)
          if (deveReceberCliente) {
            // Notificação in-app
            await notificationService.notificarLembrete(
              reuniao.cliente_id,
              reuniao,
              horasAntecedencia
            );
            
            // TODO: Implementar envio de email via API interna
            console.log(`Lembrete enviado para cliente ${reuniao.cliente_nome}`);
          }

          // Enviar lembrete para vendedor (apenas notificação in-app)
          if (deveReceberVendedor) {
            await notificationService.notificarLembrete(
              reuniao.vendedor_id,
              reuniao,
              horasAntecedencia
            );
          }

          // Marcar como lembrete enviado se foi de 24h (principal)
          if (horasAntecedencia === 24) {
            await supabase
              .from('reunioes')
              .update({ lembrete_enviado: true })
              .eq('id', reuniao.id);
          }

          // Log de sucesso
          await notificationService.registrarLog({
            usuario_id: reuniao.cliente_id,
            tipo_envio: 'email',
            tipo_notificacao: 'lembrete_reuniao',
            status: 'enviado',
            dados: { 
              reuniao_id: reuniao.id, 
              horas_antecedencia: horasAntecedencia 
            }
          });

        } catch (error) {
          console.error(`Erro ao processar lembrete para reunião ${reuniao.id}:`, error);
          
          // Log de erro
          await notificationService.registrarLog({
            usuario_id: reuniao.cliente_id,
            tipo_envio: 'email',
            tipo_notificacao: 'lembrete_reuniao',
            status: 'falhado',
            erro: error instanceof Error ? error.message : 'Erro desconhecido',
            dados: { 
              reuniao_id: reuniao.id, 
              horas_antecedencia: horasAntecedencia 
            }
          });
        }
      }

    } catch (error) {
      console.error(`Erro ao enviar lembretes automáticos de ${horasAntecedencia}h:`, error);
    }
  }

  // Verificar conflitos de agenda
  async verificarConflitosPeriodicos(): Promise<void> {
    try {
      console.log('Iniciando verificação periódica de conflitos...');
      await conflictDetector.executarVerificacaoPeriodica();
    } catch (error) {
      console.error('Erro na verificação periódica de conflitos:', error);
    }
  }

  // Limpar notificações antigas
  async limparNotificacoesAntigas(): Promise<void> {
    try {
      console.log('Limpando notificações antigas...');
      await notificationService.limparNotificacoes();
    } catch (error) {
      console.error('Erro ao limpar notificações antigas:', error);
    }
  }

  // Buscar reuniões do dia para relatório
  async buscarReunioesDia(data: string): Promise<any[]> {
    try {
      const { data: reunioes, error } = await supabase
        .from('v_reunioes_completa')
        .select(`
          id,
          cliente_nome,
          vendedor_nome,
          hora_inicio,
          hora_fim,
          titulo,
          status,
          tipo_reuniao
        `)
        .eq('data', data)
        .order('hora_inicio');

      if (error) {
        console.error('Erro ao buscar reuniões do dia:', error);
        return [];
      }

      return reunioes || [];

    } catch (error) {
      console.error('Erro ao buscar reuniões do dia:', error);
      return [];
    }
  }

  // Gerar relatório diário para administradores
  async gerarRelatorioDiario(): Promise<void> {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const reunioesHoje = await this.buscarReunioesDia(hoje);

      // Buscar administradores
      const { data: admins } = await supabase
        .from('users')
        .select('id, email, nome')
        .eq('role', 'admin');

      if (!admins || admins.length === 0) {
        console.log('Nenhum administrador encontrado para envio de relatório');
        return;
      }

      // Estatísticas do dia
      const totalReunioes = reunioesHoje.length;
      const reunioesAgendadas = reunioesHoje.filter(r => r.status === 'agendada').length;
      const reunioesConcluidas = reunioesHoje.filter(r => r.status === 'concluida').length;
      const reunioesCanceladas = reunioesHoje.filter(r => r.status === 'cancelada').length;

      for (const admin of admins) {
        try {
          // Verificar preferências do admin
          const preferencias = await notificationService.buscarPreferencias(admin.id);
          
          if (preferencias && !preferencias.email_reunioes) {
            continue; // Admin não quer receber relatórios
          }

          // Criar notificação in-app
          await notificationService.criarNotificacao({
            usuario_id: admin.id,
            tipo: 'relatorio_diario',
            titulo: `Relatório Diário - ${new Date().toLocaleDateString('pt-BR')}`,
            mensagem: `${totalReunioes} reuniões programadas: ${reunioesAgendadas} agendadas, ${reunioesConcluidas} concluídas, ${reunioesCanceladas} canceladas`,
            dados: {
              data: hoje,
              total_reunioes: totalReunioes,
              agendadas: reunioesAgendadas,
              concluidas: reunioesConcluidas,
              canceladas: reunioesCanceladas,
              reunioes: reunioesHoje
            }
          });

        } catch (error) {
          console.error(`Erro ao enviar relatório para admin ${admin.id}:`, error);
        }
      }

    } catch (error) {
      console.error('Erro ao gerar relatório diário:', error);
    }
  }

  // Executar job principal (chamado pelo cron)
  async executarJobPrincipal(): Promise<void> {
    try {
      console.log('=== Iniciando jobs de notificação ===');
      
      // Lembretes de 24 horas
      await this.enviarLembretesAutomaticos(24);
      
      // Lembretes de 2 horas
      await this.enviarLembretesAutomaticos(2);
      
      // Verificar conflitos
      await this.verificarConflitosPeriodicos();
      
      console.log('=== Jobs de notificação concluídos ===');
      
    } catch (error) {
      console.error('Erro no job principal de notificações:', error);
    }
  }

  // Job de limpeza (executar diariamente)
  async executarJobLimpeza(): Promise<void> {
    try {
      console.log('=== Iniciando job de limpeza ===');
      
      // Limpar notificações antigas
      await this.limparNotificacoesAntigas();
      
      // Gerar relatório diário
      await this.gerarRelatorioDiario();
      
      console.log('=== Job de limpeza concluído ===');
      
    } catch (error) {
      console.error('Erro no job de limpeza:', error);
    }
  }
}

export const notificationScheduler = new NotificationScheduler();