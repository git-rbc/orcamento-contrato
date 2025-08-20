import { differenceInHours } from 'date-fns';

export interface ReservaMetrics {
  id: string;
  status: 'ativa' | 'convertida' | 'expirada' | 'cancelada';
  created_at: string;
  converted_at?: string;
  usuario_id: string;
  espaco_evento_id: string;
}

export interface VendedorMetrics {
  vendedor_id: string;
  vendedor_nome: string;
  total_reservas: number;
  total_conversoes: number;
  taxa_conversao: number;
  tempo_medio: number;
}

export interface EspacoMetrics {
  espaco_id: string;
  espaco_nome: string;
  total_reservas: number;
  taxa_conversao: number;
}

/**
 * Calcula o tempo médio de conversão baseado em reservas reais
 */
export function calcularTempoMedioConversao(reservas: ReservaMetrics[]): number {
  const reservasConvertidas = reservas.filter(r => r.status === 'convertida' && r.converted_at);
  
  if (reservasConvertidas.length === 0) {
    return 0;
  }

  const tempoTotal = reservasConvertidas.reduce((acc, reserva) => {
    const inicio = new Date(reserva.created_at);
    const fim = new Date(reserva.converted_at!);
    const horas = differenceInHours(fim, inicio);
    return acc + Math.max(0, horas); // Evitar valores negativos
  }, 0);

  return tempoTotal / reservasConvertidas.length;
}

/**
 * Calcula a taxa de conversão geral
 */
export function calcularTaxaConversao(reservas: ReservaMetrics[]): number {
  if (reservas.length === 0) return 0;
  
  const conversoes = reservas.filter(r => r.status === 'convertida').length;
  return (conversoes / reservas.length) * 100;
}

/**
 * Calcula métricas por vendedor
 */
export function calcularMetricasVendedores(
  reservas: ReservaMetrics[], 
  vendedores: Array<{ id: string; nome: string }>
): VendedorMetrics[] {
  const vendedorStats = new Map<string, {
    vendedor_id: string;
    vendedor_nome: string;
    total_reservas: number;
    total_conversoes: number;
    tempo_total: number;
    conversoes_com_tempo: number;
  }>();

  reservas.forEach(reserva => {
    const vendedorId = reserva.usuario_id;
    const vendedor = vendedores.find(v => v.id === vendedorId);
    if (!vendedor) return;

    if (!vendedorStats.has(vendedorId)) {
      vendedorStats.set(vendedorId, {
        vendedor_id: vendedorId,
        vendedor_nome: vendedor.nome,
        total_reservas: 0,
        total_conversoes: 0,
        tempo_total: 0,
        conversoes_com_tempo: 0
      });
    }

    const stats = vendedorStats.get(vendedorId)!;
    stats.total_reservas++;
    
    if (reserva.status === 'convertida') {
      stats.total_conversoes++;
      
      if (reserva.converted_at) {
        const inicio = new Date(reserva.created_at);
        const fim = new Date(reserva.converted_at);
        const horas = differenceInHours(fim, inicio);
        stats.tempo_total += Math.max(0, horas);
        stats.conversoes_com_tempo++;
      }
    }
  });

  return Array.from(vendedorStats.values())
    .map(stats => ({
      ...stats,
      taxa_conversao: stats.total_reservas > 0 ? (stats.total_conversoes / stats.total_reservas) * 100 : 0,
      tempo_medio: stats.conversoes_com_tempo > 0 ? stats.tempo_total / stats.conversoes_com_tempo : 0
    }))
    .sort((a, b) => b.taxa_conversao - a.taxa_conversao);
}

/**
 * Calcula métricas por espaço
 */
export function calcularMetricasEspacos(
  reservas: ReservaMetrics[], 
  espacos: Array<{ id: string; nome: string }>
): EspacoMetrics[] {
  const espacoStats = new Map<string, {
    espaco_id: string;
    espaco_nome: string;
    total_reservas: number;
    conversoes: number;
  }>();

  reservas.forEach(reserva => {
    const espacoId = reserva.espaco_evento_id;
    const espaco = espacos.find(e => e.id === espacoId);
    if (!espaco) return;

    if (!espacoStats.has(espacoId)) {
      espacoStats.set(espacoId, {
        espaco_id: espacoId,
        espaco_nome: espaco.nome,
        total_reservas: 0,
        conversoes: 0
      });
    }

    const stats = espacoStats.get(espacoId)!;
    stats.total_reservas++;
    if (reserva.status === 'convertida') {
      stats.conversoes++;
    }
  });

  return Array.from(espacoStats.values())
    .map(stats => ({
      ...stats,
      taxa_conversao: stats.total_reservas > 0 ? (stats.conversoes / stats.total_reservas) * 100 : 0
    }))
    .sort((a, b) => b.total_reservas - a.total_reservas);
}

/**
 * Calcula estatísticas básicas de reservas
 */
export function calcularEstatisticasBasicas(reservas: ReservaMetrics[]) {
  return {
    total: reservas.length,
    ativas: reservas.filter(r => r.status === 'ativa').length,
    convertidas: reservas.filter(r => r.status === 'convertida').length,
    expiradas: reservas.filter(r => r.status === 'expirada').length,
    canceladas: reservas.filter(r => r.status === 'cancelada').length
  };
}