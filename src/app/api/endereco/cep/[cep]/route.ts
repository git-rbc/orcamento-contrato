import { NextRequest, NextResponse } from 'next/server';

// GET /api/endereco/cep/[cep] - Buscar dados de endereço por CEP
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cep: string }> }
) {
  try {
    const { cep } = await params;
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      return NextResponse.json(
        { error: 'CEP deve ter 8 dígitos' },
        { status: 400 }
      );
    }
    
    // Buscar no ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erro ao consultar CEP' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (data.erro) {
      return NextResponse.json(
        { error: 'CEP não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 