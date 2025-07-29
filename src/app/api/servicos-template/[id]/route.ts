import { NextRequest, NextResponse } from 'next/server';
import { ServicoTemplateService } from '@/services/servicos-template';
import { UpdateServicoTemplateDTO } from '@/types/database';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

// GET /api/servicos-template/[id] - Buscar serviço template por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const servico = await ServicoTemplateService.buscarPorId(id);

    if (!servico) {
      return NextResponse.json(
        createErrorResponse('Serviço template não encontrado'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(servico, 'Serviço template encontrado')
    );
  } catch (error) {
    console.error('Erro ao buscar serviço template:', error);
    return NextResponse.json(
      createErrorResponse(error instanceof Error ? error.message : 'Erro interno do servidor'),
      { status: 500 }
    );
  }
}

// PUT /api/servicos-template/[id] - Atualizar serviço template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const dadosAtualizacao: UpdateServicoTemplateDTO = {
      nome: body.nome,
      descricao: body.descricao,
      ativo: body.ativo,
      parametros: body.parametros
    };

    const servicoAtualizado = await ServicoTemplateService.atualizar(id, dadosAtualizacao);

    return NextResponse.json(
      createSuccessResponse(servicoAtualizado, 'Serviço template atualizado com sucesso')
    );
  } catch (error) {
    console.error('Erro ao atualizar serviço template:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        return NextResponse.json(
          createErrorResponse(error.message),
          { status: 404 }
        );
      }
      
      if (error.message.includes('obrigatório') || error.message.includes('deve ser')) {
        return NextResponse.json(
          createErrorResponse(error.message),
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      createErrorResponse('Erro interno do servidor'),
      { status: 500 }
    );
  }
}
