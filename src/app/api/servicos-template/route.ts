import { NextRequest, NextResponse } from 'next/server';
import { ServicoTemplateService } from '@/services/servicos-template';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

// GET /api/servicos-template - Listar todos os serviços template
export async function GET(request: NextRequest) {
  try {
    const servicos = await ServicoTemplateService.listar();

    return NextResponse.json(
      createSuccessResponse(servicos, 'Serviços template listados com sucesso')
    );
  } catch (error) {
    console.error('Erro ao listar serviços template:', error);
    return NextResponse.json(
      createErrorResponse(error instanceof Error ? error.message : 'Erro interno do servidor'),
      { status: 500 }
    );
  }
}