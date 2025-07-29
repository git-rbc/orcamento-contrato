import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// GET /api/logo - Servir logo da empresa
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'branca'; // 'branca' ou 'preta'
    
    let nomeArquivo = '';
    switch (tipo) {
      case 'preta':
        nomeArquivo = 'LOGO PRETA FUNDO TRANSP.png';
        break;
      case 'branca':
      default:
        nomeArquivo = 'LOGO BRANCA FUNDO TRANSP.png';
        break;
    }
    
    // Caminho para o arquivo da logo
    const logoPath = join(process.cwd(), 'public', 'logos', nomeArquivo);
    
    // Ler o arquivo da logo
    const logoBuffer = readFileSync(logoPath);
    
    // Retornar a imagem
    return new NextResponse(logoBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache por 1 ano
      },
    });
    
  } catch (error) {
    console.error('Erro ao servir logo:', error);
    
    // Retornar uma imagem de fallback ou erro 404
    return new NextResponse('Logo não encontrada', { 
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}