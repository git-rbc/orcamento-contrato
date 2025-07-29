import { NextRequest, NextResponse } from 'next/server';
import { ClienteService } from '@/services/clientes';
import { UpdateClienteDTO } from '@/types/database';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

// GET /api/clientes/[id] - Buscar cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cliente = await ClienteService.buscarPorId(id);

    if (!cliente) {
      return NextResponse.json(
        createErrorResponse('Cliente não encontrado'),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse(cliente));
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json(
      createErrorResponse(error instanceof Error ? error.message : 'Erro interno do servidor'),
      { status: 500 }
    );
  }
}

// PUT /api/clientes/[id] - Atualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

    const dadosAtualizacao: UpdateClienteDTO = {
      nome: body.nome,
      nome_secundario: body.nome_secundario,
      cpf_cnpj: body.cpf_cnpj,
      cpf_cnpj_secundario: body.cpf_cnpj_secundario,
      email: body.email,
      email_secundario: body.email_secundario,
      telefone: body.telefone,
      telefone_secundario: body.telefone_secundario,
      endereco: body.endereco,
      numero: body.numero,
      complemento: body.complemento,
      bairro: body.bairro,
      cidade: body.cidade,
      estado: body.estado,
      cep: body.cep,
      origem: body.origem,
      campanha: body.campanha,
      observacoes: body.observacoes,
      ativo: body.ativo
    };

    const clienteAtualizado = await ClienteService.atualizar(id, dadosAtualizacao);

    return NextResponse.json(
      createSuccessResponse(clienteAtualizado, 'Cliente atualizado com sucesso')
    );
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        return NextResponse.json(
          createErrorResponse(error.message),
          { status: 404 }
        );
      }
      
      if (error.message.includes('CPF/CNPJ já cadastrado') || 
          error.message.includes('CPF/CNPJ inválido') ||
          error.message.includes('Email inválido') ||
          error.message.includes('não pode estar vazio')) {
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

// DELETE /api/clientes/[id] - Excluir cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ClienteService.excluir(id);

    return NextResponse.json(
      createSuccessResponse(null, 'Cliente excluído com sucesso')
    );
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        return NextResponse.json(
          createErrorResponse(error.message),
          { status: 404 }
        );
      }
      
      if (error.message.includes('possui contratos')) {
        return NextResponse.json(
          createErrorResponse(error.message),
          { status: 409 } // Conflict
        );
      }
    }

    return NextResponse.json(
      createErrorResponse('Erro interno do servidor'),
      { status: 500 }
    );
  }
}

// PATCH /api/clientes/[id] - Ativar/Desativar cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    
    if (body.acao === 'ativar') {
      const cliente = await ClienteService.ativar(id);
      return NextResponse.json(
        createSuccessResponse(cliente, 'Cliente ativado com sucesso')
      );
    } else if (body.acao === 'desativar') {
      const cliente = await ClienteService.desativar(id);
      return NextResponse.json(
        createSuccessResponse(cliente, 'Cliente desativado com sucesso')
      );
    } else {
      return NextResponse.json(
        createErrorResponse('Ação inválida. Use "ativar" ou "desativar"'),
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erro ao alterar status do cliente:', error);
    
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        createErrorResponse(error.message),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createErrorResponse('Erro interno do servidor'),
      { status: 500 }
    );
  }
} 