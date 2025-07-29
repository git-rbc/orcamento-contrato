import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Template CSV com exemplos
    const csvContent = `Nome,Valores,Status,Categoria,Reajuste,Taxa de Serviço
Casamento na Praia,4500.00,Ativo,Área Adicional,Não,Sim
Casamento Dom/Sáb/Fer,5500.00,Ativo,Área Adicional,Sim,Sim
Cerimônia ao Ar Livre,2500.00,Ativo,Área Adicional,,Não
Decoração Premium,3500.00,Ativo,Decoração,Sim,Sim
Buffet Completo,8000.00,Ativo,Alimentação,Não,Sim
DJ Profissional,1500.00,Ativo,Entretenimento,,Sim
Fotografia e Vídeo,3000.00,Ativo,Mídia,Sim,Não
Iluminação Especial,1200.00,Inativo,Infraestrutura,Não,Sim
Consulta Inicial,,Ativo,Consultoria,Não,Não
Análise de Viabilidade,0,Ativo,Consultoria,Sim,Não
Serviço Personalizado,1000.00,Ativo,,Não,Sim
Taxa Administrativa,50.00,Ativo,,Sim,Não`;

    // Criar resposta com o arquivo CSV
    const response = new NextResponse(csvContent);
    
    // Configurar headers para download
    response.headers.set('Content-Type', 'text/csv; charset=utf-8');
    response.headers.set('Content-Disposition', 'attachment; filename="template_produtos.csv"');
    
    return response;
    
  } catch (error) {
    console.error('Erro ao gerar template:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar template' },
      { status: 500 }
    );
  }
} 