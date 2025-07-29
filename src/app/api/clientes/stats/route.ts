import { NextRequest, NextResponse } from 'next/server';
import { ClienteService } from '@/services/clientes';
import { createErrorResponse } from '@/lib/api-utils';

// GET /api/clientes/stats - Obter estatísticas de clientes
export async function GET(request: NextRequest) {
  try {
    const estatisticas = await ClienteService.obterEstatisticas();

    // Retornar no formato padrão com data
    return NextResponse.json({ data: estatisticas });
  } catch (error) {
    console.error('Erro ao obter estatísticas de clientes:', error);
    return NextResponse.json(
      createErrorResponse(error instanceof Error ? error.message : 'Erro interno do servidor'),
      { status: 500 }
    );
  }
} 