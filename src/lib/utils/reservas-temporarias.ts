import { differenceInHours, differenceInMinutes, parseISO, addHours } from 'date-fns';
import type { ReservaTemporaria } from '@/types/calendario';

/**
 * Calcula o tempo restante para expiração de uma reserva temporária
 */
export function calcularTempoRestante(expiresAt: string) {
  const now = new Date();
  const expires = parseISO(expiresAt);
  
  const hoursLeft = differenceInHours(expires, now);
  const minutesLeft = differenceInMinutes(expires, now) % 60;
  
  if (hoursLeft < 0) {
    return { hours: 0, minutes: 0, expired: true };
  }
  
  return { 
    hours: hoursLeft, 
    minutes: minutesLeft, 
    expired: false 
  };
}

/**
 * Calcula a porcentagem de tempo decorrido
 */
export function calcularPercentualTempo(createdAt: string, expiresAt: string) {
  const now = new Date();
  const created = parseISO(createdAt);
  const expires = parseISO(expiresAt);
  
  const totalTime = differenceInMinutes(expires, created);
  const timeElapsed = differenceInMinutes(now, created);
  
  if (timeElapsed <= 0) return 100;
  if (timeElapsed >= totalTime) return 0;
  
  return Math.max(0, ((totalTime - timeElapsed) / totalTime) * 100);
}

/**
 * Verifica se uma reserva está prestes a expirar (menos de X horas)
 */
export function isReservaExpirando(expiresAt: string, horasLimite: number = 6) {
  const now = new Date();
  const expires = parseISO(expiresAt);
  const hoursLeft = differenceInHours(expires, now);
  
  return hoursLeft <= horasLimite && hoursLeft > 0;
}

/**
 * Verifica se há conflito entre duas reservas
 */
export function verificarConflito(
  reserva1: {
    data_inicio: string;
    data_fim: string;
    hora_inicio: string;
    hora_fim: string;
  },
  reserva2: {
    data_inicio: string;
    data_fim: string;
    hora_inicio: string;
    hora_fim: string;
  }
) {
  // Verificar sobreposição de datas
  const inicio1 = reserva1.data_inicio;
  const fim1 = reserva1.data_fim;
  const inicio2 = reserva2.data_inicio;
  const fim2 = reserva2.data_fim;
  
  // Não há sobreposição de datas
  if (fim1 < inicio2 || fim2 < inicio1) {
    return false;
  }
  
  // Se há sobreposição de datas, verificar horários
  // Para simplificar, considerar conflito se há qualquer sobreposição
  const horaInicio1 = timeToMinutes(reserva1.hora_inicio);
  const horaFim1 = timeToMinutes(reserva1.hora_fim);
  const horaInicio2 = timeToMinutes(reserva2.hora_inicio);
  const horaFim2 = timeToMinutes(reserva2.hora_fim);
  
  return !(horaFim1 <= horaInicio2 || horaFim2 <= horaInicio1);
}

/**
 * Converte string de hora (HH:mm) para minutos
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Gera cor baseada no status da reserva temporária
 */
export function getStatusColor(status: ReservaTemporaria['status']) {
  switch (status) {
    case 'ativa':
      return {
        bg: 'bg-green-50 dark:bg-green-950/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-400',
        badge: 'bg-green-100 text-green-700'
      };
    case 'expirada':
      return {
        bg: 'bg-gray-50 dark:bg-gray-950/20',
        border: 'border-gray-200 dark:border-gray-800',
        text: 'text-gray-700 dark:text-gray-400',
        badge: 'bg-gray-100 text-gray-700'
      };
    case 'convertida':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-400',
        badge: 'bg-blue-100 text-blue-700'
      };
    case 'liberada':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/20',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-700 dark:text-purple-400',
        badge: 'bg-purple-100 text-purple-700'
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-950/20',
        border: 'border-gray-200 dark:border-gray-800',
        text: 'text-gray-700 dark:text-gray-400',
        badge: 'bg-gray-100 text-gray-700'
      };
  }
}

/**
 * Calcula prioridade na fila baseado na pontuação
 */
export function calcularPosicaoFila(
  novaPontuacao: number,
  filaAtual: Array<{ pontuacao: number }>
): number {
  let posicao = 1;
  
  for (const item of filaAtual) {
    if (novaPontuacao >= item.pontuacao) break;
    posicao++;
  }
  
  return posicao;
}

/**
 * Formatar tempo restante para exibição
 */
export function formatarTempoRestante(expiresAt: string): string {
  const { hours, minutes, expired } = calcularTempoRestante(expiresAt);
  
  if (expired) return 'Expirada';
  if (hours === 0 && minutes === 0) return 'Expirando';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  
  return `${hours}h ${minutes}m`;
}

/**
 * Obter texto de status da reserva temporária
 */
export function getStatusText(status: ReservaTemporaria['status']): string {
  switch (status) {
    case 'ativa':
      return 'Ativa';
    case 'expirada':
      return 'Expirada';
    case 'convertida':
      return 'Convertida';
    case 'liberada':
      return 'Liberada';
    default:
      return 'Desconhecido';
  }
}

/**
 * Validar dados de reserva temporária
 */
export function validarDadosReserva(dados: {
  espaco_evento_id: string;
  data_inicio: string;
  data_fim: string;
  hora_inicio: string;
  hora_fim: string;
}) {
  const erros: string[] = [];
  
  if (!dados.espaco_evento_id) {
    erros.push('Espaço é obrigatório');
  }
  
  if (!dados.data_inicio) {
    erros.push('Data de início é obrigatória');
  }
  
  if (!dados.data_fim) {
    erros.push('Data de fim é obrigatória');
  }
  
  if (!dados.hora_inicio) {
    erros.push('Hora de início é obrigatória');
  }
  
  if (!dados.hora_fim) {
    erros.push('Hora de fim é obrigatória');
  }
  
  // Validar se data de início não é posterior à data de fim
  if (dados.data_inicio && dados.data_fim && dados.data_inicio > dados.data_fim) {
    erros.push('Data de início não pode ser posterior à data de fim');
  }
  
  // Validar se hora de início não é posterior à hora de fim (no mesmo dia)
  if (dados.data_inicio === dados.data_fim && dados.hora_inicio && dados.hora_fim) {
    const inicio = timeToMinutes(dados.hora_inicio);
    const fim = timeToMinutes(dados.hora_fim);
    
    if (inicio >= fim) {
      erros.push('Hora de início deve ser anterior à hora de fim');
    }
  }
  
  return {
    valido: erros.length === 0,
    erros
  };
}

/**
 * Calcular estimativa de tempo na fila
 */
export function calcularEstimativaTempo(posicao: number): string {
  // Estimativa baseada em histórico: média de 2 horas por posição
  const horas = posicao * 2;
  
  if (horas < 1) return 'Menos de 1h';
  if (horas < 24) return `~${horas}h`;
  
  const dias = Math.ceil(horas / 24);
  return `~${dias} dia${dias > 1 ? 's' : ''}`;
}