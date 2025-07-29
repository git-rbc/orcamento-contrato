import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const currentYear = new Date().getFullYear();

  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${currentYear}`, {
      next: {
        revalidate: 60 * 60 * 24, // Revalida a cada 24 horas
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ message: 'Erro ao buscar feriados na BrasilAPI', details: errorData }, { status: response.status });
    }

    const holidays = await response.json();
    return NextResponse.json(holidays);

  } catch (error) {
    console.error('Erro interno ao buscar feriados:', error);
    return NextResponse.json({ message: 'Erro interno no servidor' }, { status: 500 });
  }
} 