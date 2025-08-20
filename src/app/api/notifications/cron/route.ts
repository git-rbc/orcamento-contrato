import { NextRequest, NextResponse } from 'next/server';
import { 
  verificarExpiracoes, 
  verificarAltaDemanda, 
  gerarRelatorioDiario,
  executarJobsNotificacoes 
} from '@/lib/jobs/verificar-expiracoes';
import { notificationScheduler } from '@/lib/jobs/notification-scheduler';

/**
 * API Route para executar jobs de notificação via cron jobs
 * 
 * Exemplos de uso:
 * 
 * 1. Verificar expirações (executar a cada hora):
 *    curl -X POST "https://seu-dominio.com/api/notifications/cron?job=expiracoes" \
 *         -H "Authorization: Bearer SEU_CRON_SECRET"
 * 
 * 2. Verificar alta demanda (executar a cada 6 horas):
 *    curl -X POST "https://seu-dominio.com/api/notifications/cron?job=alta-demanda" \
 *         -H "Authorization: Bearer SEU_CRON_SECRET"
 * 
 * 3. Gerar relatório diário (executar uma vez por dia):
 *    curl -X POST "https://seu-dominio.com/api/notifications/cron?job=relatorio-diario" \
 *         -H "Authorization: Bearer SEU_CRON_SECRET"
 * 
 * 4. Executar todos os jobs:
 *    curl -X POST "https://seu-dominio.com/api/notifications/cron?job=todos" \
 *         -H "Authorization: Bearer SEU_CRON_SECRET"
 */

export async function POST(request: NextRequest) {
  try {
    // Verificar autorização
    const authToken = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!process.env.CRON_SECRET) {
      console.error('CRON_SECRET não configurado');
      return NextResponse.json(
        { error: 'Configuração de segurança ausente' },
        { status: 500 }
      );
    }

    if (authToken !== expectedToken) {
      console.warn('Tentativa de acesso não autorizada aos jobs de cron');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Obter tipo de job da query string
    const url = new URL(request.url);
    const job = url.searchParams.get('job') || 'expiracoes';

    let resultado;
    const startTime = Date.now();

    console.log(`Executando job: ${job} em ${new Date().toISOString()}`);

    switch (job) {
      case 'expiracoes':
        resultado = await verificarExpiracoes();
        break;
      
      case 'alta-demanda':
        resultado = await verificarAltaDemanda();
        break;
      
      case 'relatorio-diario':
        resultado = await gerarRelatorioDiario();
        break;
      
      case 'lembretes':
        await notificationScheduler.executarJobPrincipal();
        resultado = { message: 'Jobs de lembretes e conflitos executados' };
        break;
      
      case 'limpeza':
        await notificationScheduler.executarJobLimpeza();
        resultado = { message: 'Job de limpeza executado' };
        break;
      
      case 'conflitos':
        await notificationScheduler.verificarConflitosPeriodicos();
        resultado = { message: 'Verificação de conflitos executada' };
        break;
      
      case 'todos':
        resultado = await executarJobsNotificacoes();
        // Executar também os novos jobs
        await notificationScheduler.executarJobPrincipal();
        await notificationScheduler.executarJobLimpeza();
        break;
      
      default:
        return NextResponse.json(
          { error: `Job '${job}' não encontrado` },
          { status: 404 }
        );
    }

    const executionTime = Date.now() - startTime;

    const response = {
      success: true,
      job,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString(),
      resultado,
    };

    console.log(`Job ${job} executado com sucesso em ${executionTime}ms`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erro na execução do job de cron:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro na execução do job',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Endpoint para verificar status dos jobs
export async function GET(request: NextRequest) {
  try {
    const authToken = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authToken !== expectedToken) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Status básico dos jobs
    const status = {
      timestamp: new Date().toISOString(),
      jobs: {
        'expiracoes': {
          description: 'Verifica e notifica reservas expirando',
          frequency: 'A cada hora',
          endpoint: '/api/notifications/cron?job=expiracoes',
        },
        'alta-demanda': {
          description: 'Verifica filas com alta demanda',
          frequency: 'A cada 6 horas',
          endpoint: '/api/notifications/cron?job=alta-demanda',
        },
        'relatorio-diario': {
          description: 'Gera relatório diário de atividades',
          frequency: 'Uma vez por dia (08:00)',
          endpoint: '/api/notifications/cron?job=relatorio-diario',
        },
        'lembretes': {
          description: 'Envia lembretes de reuniões (24h e 2h antes)',
          frequency: 'A cada 30 minutos',
          endpoint: '/api/notifications/cron?job=lembretes',
        },
        'conflitos': {
          description: 'Verifica conflitos de agenda',
          frequency: 'A cada 2 horas',
          endpoint: '/api/notifications/cron?job=conflitos',
        },
        'limpeza': {
          description: 'Limpa notificações antigas e gera relatórios',
          frequency: 'Uma vez por dia (02:00)',
          endpoint: '/api/notifications/cron?job=limpeza',
        },
        'todos': {
          description: 'Executa todos os jobs em sequência',
          frequency: 'Conforme necessário',
          endpoint: '/api/notifications/cron?job=todos',
        },
      },
      environment: {
        cronSecretConfigured: !!process.env.CRON_SECRET,
        resendConfigured: !!process.env.RESEND_API_KEY,
        adminEmailConfigured: !!process.env.ADMIN_EMAIL,
      },
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Erro ao obter status dos jobs:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao obter status',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

/**
 * API endpoint para jobs automatizados de notificacoes.
 * Suporta: expiracoes, alta-demanda, relatorio-diario
 */