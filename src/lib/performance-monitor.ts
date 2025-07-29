// Sistema de monitoramento de performance para otimizações Supabase
interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  cacheHit?: boolean;
  queryCount?: number;
  timestamp: number;
  metadata?: any;
}

interface QueryAnalytics {
  totalQueries: number;
  averageLatency: number;
  cacheHitRate: number;
  errorRate: number;
  slowQueries: PerformanceMetric[];
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000; // Limitar memória
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 segundo

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Medir performance de uma operação
  async measureOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;
    let result: T;

    try {
      result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        operation,
        duration,
        success,
        timestamp: Date.now(),
        metadata
      });
    }
  }

  // Registrar métrica de cache
  recordCacheHit(operation: string, hit: boolean): void {
    this.recordMetric({
      operation: `cache_${operation}`,
      duration: 0,
      success: true,
      cacheHit: hit,
      timestamp: Date.now()
    });
  }

  // Registrar métrica customizada
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Manter apenas as últimas métricas
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log queries lentas
    if (metric.duration > this.SLOW_QUERY_THRESHOLD) {
      console.warn(`Slow query detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`);
    }
  }

  // Obter analytics das últimas 24h
  getAnalytics(hours: number = 24): QueryAnalytics {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    const totalQueries = recentMetrics.length;
    const successfulQueries = recentMetrics.filter(m => m.success);
    const cacheMetrics = recentMetrics.filter(m => m.cacheHit !== undefined);
    const cacheHits = cacheMetrics.filter(m => m.cacheHit === true);
    const slowQueries = recentMetrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD);

    const averageLatency = totalQueries > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries 
      : 0;

    const cacheHitRate = cacheMetrics.length > 0 
      ? (cacheHits.length / cacheMetrics.length) * 100 
      : 0;

    const errorRate = totalQueries > 0 
      ? ((totalQueries - successfulQueries.length) / totalQueries) * 100 
      : 0;

    return {
      totalQueries,
      averageLatency,
      cacheHitRate,
      errorRate,
      slowQueries: slowQueries.slice(-10) // Últimas 10 queries lentas
    };
  }

  // Obter top operações por latência
  getTopSlowOperations(limit: number = 10): Array<{
    operation: string;
    averageLatency: number;
    count: number;
  }> {
    const operationStats = new Map<string, { total: number; count: number }>();

    this.metrics.forEach(metric => {
      const current = operationStats.get(metric.operation) || { total: 0, count: 0 };
      current.total += metric.duration;
      current.count += 1;
      operationStats.set(metric.operation, current);
    });

    return Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        averageLatency: stats.total / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.averageLatency - a.averageLatency)
      .slice(0, limit);
  }

  // Obter métricas de cache por operação
  getCacheStats(): Map<string, { hits: number; misses: number; hitRate: number }> {
    const cacheStats = new Map<string, { hits: number; misses: number }>();

    this.metrics
      .filter(m => m.cacheHit !== undefined)
      .forEach(metric => {
        const operation = metric.operation.replace('cache_', '');
        const current = cacheStats.get(operation) || { hits: 0, misses: 0 };
        
        if (metric.cacheHit) {
          current.hits += 1;
        } else {
          current.misses += 1;
        }
        
        cacheStats.set(operation, current);
      });

    // Adicionar hit rate calculado
    const result = new Map<string, { hits: number; misses: number; hitRate: number }>();
    cacheStats.forEach((stats, operation) => {
      const total = stats.hits + stats.misses;
      const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
      result.set(operation, { ...stats, hitRate });
    });

    return result;
  }

  // Gerar relatório detalhado
  generateReport(): {
    summary: QueryAnalytics;
    topSlowOperations: Array<{operation: string; averageLatency: number; count: number}>;
    cacheStats: Map<string, { hits: number; misses: number; hitRate: number }>;
    recommendations: string[];
  } {
    const summary = this.getAnalytics();
    const topSlowOperations = this.getTopSlowOperations();
    const cacheStats = this.getCacheStats();
    const recommendations = this.generateRecommendations(summary, topSlowOperations, cacheStats);

    return {
      summary,
      topSlowOperations,
      cacheStats,
      recommendations
    };
  }

  // Gerar recomendações automáticas
  private generateRecommendations(
    summary: QueryAnalytics,
    slowOps: Array<{operation: string; averageLatency: number; count: number}>,
    cacheStats: Map<string, { hits: number; misses: number; hitRate: number }>
  ): string[] {
    const recommendations: string[] = [];

    // Verificar erro rate
    if (summary.errorRate > 5) {
      recommendations.push(`Taxa de erro alta (${summary.errorRate.toFixed(1)}%) - verificar logs de erro`);
    }

    // Verificar latência média
    if (summary.averageLatency > 500) {
      recommendations.push(`Latência média alta (${summary.averageLatency.toFixed(0)}ms) - considerar otimizar consultas mais frequentes`);
    }

    // Verificar cache hit rate
    const avgCacheHitRate = Array.from(cacheStats.values())
      .reduce((sum, stats) => sum + stats.hitRate, 0) / cacheStats.size;
    
    if (avgCacheHitRate < 70) {
      recommendations.push(`Taxa de cache baixa (${avgCacheHitRate.toFixed(1)}%) - considerar aumentar TTL ou melhorar estratégia de cache`);
    }

    // Verificar operações lentas específicas
    slowOps.slice(0, 3).forEach(op => {
      if (op.averageLatency > 1000) {
        recommendations.push(`Operação '${op.operation}' muito lenta (${op.averageLatency.toFixed(0)}ms) - considerar criar índice específico`);
      }
    });

    // Verificar queries lentas frequentes
    if (summary.slowQueries.length > summary.totalQueries * 0.1) {
      recommendations.push(`Muitas queries lentas detectadas - revisar índices do banco de dados`);
    }

    return recommendations;
  }

  // Métodos de alias para o hook
  trackOperation = this.measureOperation;

  trackCacheHit(operation: string): void {
    this.recordCacheHit(operation, true);
  }

  trackCacheMiss(operation: string): void {
    this.recordCacheHit(operation, false);
  }

  getReport = this.generateReport;
  
  clearMetrics = this.reset;

  // Limpar métricas antigas
  clearOldMetrics(hoursToKeep: number = 24): void {
    const cutoff = Date.now() - (hoursToKeep * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  // Reset completo
  reset(): void {
    this.metrics = [];
  }
}

// Wrapper para instrumentar operações Supabase
export class InstrumentedSupabaseService {
  private monitor = PerformanceMonitor.getInstance();

  async query<T>(
    operation: string,
    queryFn: () => Promise<T>,
    cacheKey?: string,
    cacheValue?: T
  ): Promise<T> {
    // Verificar cache primeiro
    if (cacheKey && cacheValue) {
      this.monitor.recordCacheHit(operation, true);
      return cacheValue;
    }

    // Registrar miss se tinha chave de cache
    if (cacheKey) {
      this.monitor.recordCacheHit(operation, false);
    }

    // Executar query com medição
    return this.monitor.measureOperation(operation, queryFn, {
      cacheKey: cacheKey || null,
      hasCacheStrategy: !!cacheKey
    });
  }
}

// Hook React para usar o Performance Monitor
export function usePerformanceMetrics() {
  const monitor = PerformanceMonitor.getInstance();
  
  return {
    trackOperation: monitor.trackOperation.bind(monitor),
    trackCacheHit: monitor.trackCacheHit.bind(monitor),
    trackCacheMiss: monitor.trackCacheMiss.bind(monitor),
    getAnalytics: monitor.getAnalytics.bind(monitor),
    getReport: monitor.getReport.bind(monitor),
    getCacheStats: monitor.getCacheStats.bind(monitor),
    clearMetrics: monitor.clearMetrics.bind(monitor)
  };
}

// Singleton export
export const performanceMonitor = PerformanceMonitor.getInstance();

// Middleware para APIs
export function withPerformanceTracking(
  operation: string,
  handler: (...args: any[]) => Promise<any>
) {
  return async (...args: any[]) => {
    return performanceMonitor.measureOperation(
      operation,
      () => handler(...args)
    );
  };
}

// Utilitário para debug de performance
export function logPerformanceReport(): void {
  const report = performanceMonitor.generateReport();
  
  console.group('🚀 Performance Report');
  console.log('📊 Summary:', report.summary);
  console.log('🐌 Slow Operations:', report.topSlowOperations);
  console.log('💾 Cache Stats:', Object.fromEntries(report.cacheStats));
  console.log('💡 Recommendations:', report.recommendations);
  console.groupEnd();
} 