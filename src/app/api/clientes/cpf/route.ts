import { NextRequest, NextResponse } from 'next/server';
import { ClienteService } from '@/services/clientes';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

// GET /api/clientes/cpf?documento=12345678901 - Buscar cliente por CPF/CNPJ específico
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const documento = searchParams.get('documento');
    const exato = searchParams.get('exato') === 'true'; // Busca exata ou flexível

    if (!documento) {
      return NextResponse.json(
        createErrorResponse('Parâmetro "documento" é obrigatório'),
        { status: 400 }
      );
    }

    // Limpar formatação
    const documentoLimpo = documento.replace(/\D/g, '');

    // Validar tamanho
    if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
      return NextResponse.json(
        createErrorResponse('Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)'),
        { status: 400 }
      );
    }

    let cliente;

    if (exato) {
      // Busca exata
      cliente = await ClienteService.buscarPorCpfCnpj(documentoLimpo);
      
      if (!cliente) {
        return NextResponse.json(
          createErrorResponse('Cliente não encontrado'),
          { status: 404 }
        );
      }

      return NextResponse.json(createSuccessResponse(cliente));
    } else {
      // Busca flexível (pode retornar múltiplos resultados)
      const clientes = await ClienteService.buscarPorCpfCnpjFlexivel(documentoLimpo);
      
      return NextResponse.json(createSuccessResponse({
        total: clientes.length,
        clientes: clientes
      }));
    }

  } catch (error) {
    console.error('Erro ao buscar cliente por CPF/CNPJ:', error);
    return NextResponse.json(
      createErrorResponse(error instanceof Error ? error.message : 'Erro interno do servidor'),
      { status: 500 }
    );
  }
} 