import { NextRequest, NextResponse } from 'next/server';
import { ClienteService } from '@/services/clientes';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

// GET /api/clientes/search - Buscar clientes para autocomplete/select
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const termo = searchParams.get('q') || '';
    const limite = parseInt(searchParams.get('limit') || '10', 10);
    const cpfCnpj = searchParams.get('cpf_cnpj'); // Busca específica por CPF/CNPJ

    let clientes;

    if (cpfCnpj) {
      // Busca específica por CPF/CNPJ (flexível)
      clientes = await ClienteService.buscarPorCpfCnpjFlexivel(cpfCnpj);
    } else {
      // Busca geral para autocomplete
      clientes = await ClienteService.buscarParaSelect(termo, Math.min(limite, 50));
    }

    return NextResponse.json(createSuccessResponse(clientes));
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return NextResponse.json(
      createErrorResponse(error instanceof Error ? error.message : 'Erro interno do servidor'),
      { status: 500 }
    );
  }
} 