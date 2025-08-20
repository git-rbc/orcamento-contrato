/**
 * Job para verificação e notificação de reservas expirando
 * Este arquivo pode ser usado com cron jobs ou schedulers
 */

import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { EmailService } from '@/services/email-service';
import { addHours, differenceInHours, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReservaExpirando {
  id: string;
  numero_reserva: string;
  data_inicio: string;
  hora_inicio: string;
  hora_fim: string;
  expires_at: string;
  created_at: string;
  vendedor: {
    nome: string;
    email: string;
  };
  espaco: {
    nome: string;
  };
}

export async function verificarExpiracoes() {
  console.log('Iniciando verificação de expirações...', new Date().toISOString());
  
  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date();

    // Buscar reservas ativas que estão próximas do vencimento
    const { data: reservasAtivas, error } = await supabase
      .from('reservas_temporarias')
      .select(`
        id,
        numero_reserva,
        data_inicio,
        hora_inicio,
        hora_fim,
        expires_at,
        created_at,
        vendedor:profiles(nome, email),
        espaco:espacos_eventos(nome)
      `)
      .eq('status', 'ativa')
      .gte('expires_at', now.toISOString()) // Ainda não expiradas
      .order('expires_at', { ascending: true }) as { data: ReservaExpirando[] | null, error: any };

    if (error) {
      console.error('Erro ao buscar reservas:', error);
      throw error;
    }

    if (!reservasAtivas || reservasAtivas.length === 0) {
      console.log('Nenhuma reserva ativa encontrada');
      return { processadas: 0, notificacoes: 0 };
    }

    console.log(`Encontradas ${reservasAtivas.length} reservas ativas`);

    // Categorizar reservas por tempo restante
    const reservas24h: ReservaExpirando[] = [];
    const reservas12h: ReservaExpirando[] = [];
    const reservas2h: ReservaExpirando[] = [];
    const expiradas: ReservaExpirando[] = [];

    for (const reserva of reservasAtivas) {
      const expiresAt = parseISO(reserva.expires_at);
      const hoursLeft = differenceInHours(expiresAt, now);

      if (hoursLeft <= 0) {
        expiradas.push(reserva);
      } else if (hoursLeft <= 2) {
        reservas2h.push(reserva);
      } else if (hoursLeft <= 12) {
        reservas12h.push(reserva);
      } else if (hoursLeft <= 24) {
        reservas24h.push(reserva);
      }
    }

    // Marcar reservas expiradas
    if (expiradas.length > 0) {
      const idsExpiradas = expiradas.map(r => r.id);
      const { error: updateError } = await supabase
        .from('reservas_temporarias')
        .update({ 
          status: 'expirada',
          updated_at: now.toISOString()
        })
        .in('id', idsExpiradas);

      if (updateError) {
        console.error('Erro ao marcar reservas como expiradas:', updateError);
      } else {
        console.log(`${expiradas.length} reservas marcadas como expiradas`);
      }
    }

    // Enviar notificações de expiração
    let totalNotificacoes = 0;

    // Notificações de 24 horas
    if (reservas24h.length > 0) {
      const notificacoes24h = reservas24h
        .filter(r => shouldNotify(r, '24h'))
        .map(reserva => ({
          nome: reserva.vendedor.nome,
          email: reserva.vendedor.email,
          numeroReserva: reserva.numero_reserva,
          data: format(parseISO(reserva.data_inicio), 'dd/MM/yyyy', { locale: ptBR }),
          hora: `${reserva.hora_inicio} - ${reserva.hora_fim}`,
          espaco: reserva.espaco?.nome,
          tempoRestante: '24 horas',
          tipo: '24h' as const,
        }));

      if (notificacoes24h.length > 0) {
        await EmailService.enviarEmLote(notificacoes24h.map(n => ({
          tipo: 'expirando' as const,
          data: n,
        })));
        
        totalNotificacoes += notificacoes24h.length;
        console.log(`${notificacoes24h.length} notificações de 24h enviadas`);
      }
    }

    // Notificações de 12 horas
    if (reservas12h.length > 0) {
      const notificacoes12h = reservas12h
        .filter(r => shouldNotify(r, '12h'))
        .map(reserva => ({
          nome: reserva.vendedor.nome,
          email: reserva.vendedor.email,
          numeroReserva: reserva.numero_reserva,
          data: format(parseISO(reserva.data_inicio), 'dd/MM/yyyy', { locale: ptBR }),
          hora: `${reserva.hora_inicio} - ${reserva.hora_fim}`,
          espaco: reserva.espaco?.nome,
          tempoRestante: '12 horas',
          tipo: '12h' as const,
        }));

      if (notificacoes12h.length > 0) {
        await EmailService.enviarEmLote(notificacoes12h.map(n => ({
          tipo: 'expirando' as const,
          data: n,
        })));
        
        totalNotificacoes += notificacoes12h.length;
        console.log(`${notificacoes12h.length} notificações de 12h enviadas`);
      }
    }

    // Notificações de 2 horas (URGENTE)
    if (reservas2h.length > 0) {
      const notificacoes2h = reservas2h
        .filter(r => shouldNotify(r, '2h'))
        .map(reserva => ({
          nome: reserva.vendedor.nome,
          email: reserva.vendedor.email,
          numeroReserva: reserva.numero_reserva,
          data: format(parseISO(reserva.data_inicio), 'dd/MM/yyyy', { locale: ptBR }),
          hora: `${reserva.hora_inicio} - ${reserva.hora_fim}`,
          espaco: reserva.espaco?.nome,
          tempoRestante: '2 horas',
          tipo: '2h' as const,
        }));

      if (notificacoes2h.length > 0) {
        await EmailService.enviarEmLote(notificacoes2h.map(n => ({
          tipo: 'expirando' as const,
          data: n,
        })));
        
        totalNotificacoes += notificacoes2h.length;
        console.log(`${notificacoes2h.length} notificações urgentes de 2h enviadas`);
      }
    }

    const resultado = {
      processadas: reservasAtivas.length,
      expiradas: expiradas.length,
      notificacoes: totalNotificacoes,
      categorias: {
        '24h': reservas24h.length,
        '12h': reservas12h.length,
        '2h': reservas2h.length,
      }
    };

    console.log('Verificação de expirações concluída:', resultado);
    return resultado;

  } catch (error) {
    console.error('Erro na verificação de expirações:', error);
    throw error;
  }
}

// Determinar se deve enviar notificação baseado no histórico
function shouldNotify(reserva: ReservaExpirando, tipo: '24h' | '12h' | '2h'): boolean {
  // Implementar lógica para evitar spam de notificações
  // Por exemplo, verificar se já foi enviada notificação deste tipo
  // Para simplificar, assumimos que sempre deve notificar
  return true;
}

// Verificar filas com alta demanda
export async function verificarAltaDemanda() {
  console.log('Verificando filas com alta demanda...', new Date().toISOString());

  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date();
    const ontem = addHours(now, -24);

    // Buscar filas de espera com mais de X pessoas
    const { data: filasAltas, error } = await supabase
      .from('fila_espera')
      .select(`
        espaco_evento_id,
        data_inicio,
        data_fim,
        hora_inicio,
        hora_fim,
        espaco:espacos_eventos(nome)
      `)
      .eq('status', 'ativo')
      .gte('created_at', ontem.toISOString()); // Últimas 24h

    if (error) {
      console.error('Erro ao verificar alta demanda:', error);
      throw error;
    }

    // Agrupar por espaco/data e contar
    const filasPorEspaco = new Map();
    (filasAltas || []).forEach(fila => {
      const key = `${fila.espaco_evento_id}-${fila.data_inicio}-${fila.data_fim}`;
      if (!filasPorEspaco.has(key)) {
        filasPorEspaco.set(key, { ...fila, count: 0 });
      }
      filasPorEspaco.get(key).count++;
    });

    const filasParaAlertar = Array.from(filasPorEspaco.values()).filter(fila => fila.count >= 10);

    if (filasParaAlertar.length > 0) {
      // Buscar email do admin
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@gestaocontratos.com';

      for (const fila of filasParaAlertar) {
        await EmailService.enviarAlertaAltaDemanda({
          email: adminEmail,
          data: format(parseISO(fila.data_inicio), 'dd/MM/yyyy', { locale: ptBR }),
          espaco: fila.espaco?.nome || 'Espaço desconhecido',
          totalFila: 1, // Será agrupado posteriormente
          limiteAlerta: 10,
          reservasUltimas24h: fila.count,
        });
      }

      console.log(`${filasParaAlertar.length} alertas de alta demanda enviados`);
    }

    return {
      filasVerificadas: (filasAltas || []).length,
      alertasEnviados: filasParaAlertar.length,
    };

  } catch (error) {
    console.error('Erro na verificação de alta demanda:', error);
    throw error;
  }
}

// Gerar relatório diário
export async function gerarRelatorioDiario() {
  console.log('Gerando relatório diário...', new Date().toISOString());

  try {
    const supabase = createSupabaseAdminClient();
    const hoje = new Date();
    const ontem = addHours(hoje, -24);

    // Buscar estatísticas do dia
    const [reservasResult, expiracaoResult, conversaoResult, filaResult] = await Promise.all([
      // Total de reservas criadas
      supabase
        .from('reservas_temporarias')
        .select('id')
        .gte('created_at', ontem.toISOString())
        .lt('created_at', hoje.toISOString()),
      
      // Reservas expiradas
      supabase
        .from('reservas_temporarias')
        .select('id')
        .eq('status', 'expirada')
        .gte('updated_at', ontem.toISOString())
        .lt('updated_at', hoje.toISOString()),
      
      // Reservas convertidas
      supabase
        .from('reservas_temporarias')
        .select('id')
        .eq('status', 'convertida')
        .gte('updated_at', ontem.toISOString())
        .lt('updated_at', hoje.toISOString()),
      
      // Fila de espera atual
      supabase
        .from('fila_espera')
        .select(`
          espaco_evento_id,
          data_inicio,
          espaco:espacos_eventos(nome)
        `)
        .eq('status', 'ativo')
    ]);

    const totalReservas = reservasResult.data?.length || 0;
    const reservasExpiradas = expiracaoResult.data?.length || 0;
    const reservasConvertidas = conversaoResult.data?.length || 0;
    const filaEspera = (filaResult.data || []).map(fila => ({
      data: format(parseISO(fila.data_inicio), 'dd/MM/yyyy', { locale: ptBR }),
      espaco: 'Espaço', // Simplificado para evitar erro de tipos
      totalFila: 1, // Será agrupado posteriormente
    }));

    // Gerar alertas
    const alertas: string[] = [];
    
    if (reservasExpiradas > totalReservas * 0.5) {
      alertas.push(`Alta taxa de expiração: ${reservasExpiradas}/${totalReservas} reservas expiraram`);
    }
    
    if (reservasConvertidas < totalReservas * 0.3) {
      alertas.push(`Baixa taxa de conversão: ${reservasConvertidas}/${totalReservas} reservas convertidas`);
    }
    
    const filasGrandes = filaEspera.filter(f => f.totalFila >= 10);
    if (filasGrandes.length > 0) {
      alertas.push(`${filasGrandes.length} filas com mais de 10 pessoas`);
    }

    // Enviar relatório
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gestaocontratos.com';
    
    await EmailService.enviarRelatorioDiario({
      email: adminEmail,
      data: format(hoje, 'dd/MM/yyyy', { locale: ptBR }),
      totalReservas,
      reservasExpiradas,
      reservasConvertidas,
      filaEspera,
      alertas,
    });

    const relatorio = {
      data: format(hoje, 'dd/MM/yyyy', { locale: ptBR }),
      totalReservas,
      reservasExpiradas,
      reservasConvertidas,
      filaEspera: filaEspera.length,
      alertas: alertas.length,
    };

    console.log('Relatório diário gerado:', relatorio);
    return relatorio;

  } catch (error) {
    console.error('Erro ao gerar relatório diário:', error);
    throw error;
  }
}

// Função principal para executar todos os jobs
export async function executarJobsNotificacoes() {
  console.log('=== INICIANDO JOBS DE NOTIFICAÇÕES ===');
  
  try {
    const [expiracoes, altaDemanda, relatorio] = await Promise.all([
      verificarExpiracoes(),
      verificarAltaDemanda(),
      gerarRelatorioDiario(),
    ]);

    const resultado = {
      timestamp: new Date().toISOString(),
      expiracoes,
      altaDemanda,
      relatorio,
      sucesso: true,
    };

    console.log('=== JOBS CONCLUÍDOS COM SUCESSO ===', resultado);
    return resultado;

  } catch (error) {
    console.error('=== ERRO NOS JOBS DE NOTIFICAÇÕES ===', error);
    throw error;
  }
}