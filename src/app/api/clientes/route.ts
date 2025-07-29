import { NextRequest, NextResponse } from 'next/server';
import { ClienteService } from '@/services/clientes';
import { CreateClienteDTO, ClienteFilters } from '@/types/database';
import { createSuccessResponse, createErrorResponse, validatePaginationParams } from '@/lib/api-utils';

// GET /api/clientes - Listar clientes com filtros e paginação
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parâmetros de paginação
    const { page, limit } = validatePaginationParams(
      searchParams.get('page') || undefined,
      searchParams.get('limit') || undefined
    );

    // Verificar se é busca simples por termo
    const search = searchParams.get('search');
    const codigo = searchParams.get('codigo');
    const tipoPessoa = searchParams.get('tipo_pessoa'); // pessoa_fisica, empresa ou undefined
    const ativo = searchParams.get('ativo'); // true, false ou undefined
    
    let filters: ClienteFilters = {};
    
    if (codigo) {
      // Se há busca por código, usar filtro específico
      filters.codigo = codigo;
    } else if (search) {
      // Se há termo de busca, buscar em nome, email e CPF/CNPJ
      filters.nome = search;
    } else {
      // Filtros específicos
      filters = {
        nome: searchParams.get('nome') || undefined,
        cpf_cnpj: searchParams.get('cpf_cnpj') || undefined,
        email: searchParams.get('email') || undefined,
        cidade: searchParams.get('cidade') || undefined,
      };
    }

    // Adicionar filtro por tipo de pessoa se especificado (independente de ter busca ou não)
    if (tipoPessoa) {
      filters.tipo_pessoa = tipoPessoa as 'pessoa_fisica' | 'empresa';
    }

    // Adicionar filtro por status ativo se especificado (independente de ter busca ou não)
    if (ativo !== null && ativo !== undefined) {
      filters.ativo = ativo === 'true';
    }

    const resultado = await ClienteService.listar(filters, page, limit);

    // Retornar o resultado paginado com estrutura correta
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    return NextResponse.json(
      createErrorResponse(error instanceof Error ? error.message : 'Erro interno do servidor'),
      { status: 500 }
    );
  }
}

// POST /api/clientes - Criar novo cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar dados obrigatórios
    if (!body.nome || !body.cpf_cnpj) {
      return NextResponse.json(
        createErrorResponse('Nome e CPF/CNPJ são obrigatórios'),
        { status: 400 }
      );
    }

    const dadosCliente: CreateClienteDTO = {
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

    const novoCliente = await ClienteService.criar(dadosCliente);

    return NextResponse.json(
      createSuccessResponse(novoCliente, 'Cliente criado com sucesso'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    
    // Retornar erro específico se for de validação
    if (error instanceof Error) {
      if (error.message.includes('CPF/CNPJ já cadastrado') || 
          error.message.includes('CPF/CNPJ inválido') ||
          error.message.includes('Email inválido') ||
          error.message.includes('obrigatório')) {
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