import { NextRequest, NextResponse } from 'next/server';

// GET /api/empresas/cnpj/[cnpj] - Buscar dados de empresa por CNPJ
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  try {
    const { cnpj } = await params;
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      return NextResponse.json(
        { error: 'CNPJ deve ter 14 dígitos' },
        { status: 400 }
      );
    }
    
    // Usando a API CNPJá gratuita - pode ter limites de uso
    const response = await fetch(`https://open.cnpja.com/office/${cnpjLimpo}`);
    
    if (!response.ok) {
      // A API pode retornar 429 (Too Many Requests) ou outros erros
      return NextResponse.json(
        { error: `Erro na API de CNPJ: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 