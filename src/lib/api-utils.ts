import { ApiResponse, PaginatedResponse } from '@/types/database';
import { NextResponse } from 'next/server';

// Função para criar resposta de sucesso
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return { data, message };
}

// Função para criar resposta de erro
export function createErrorResponse(error: string): ApiResponse<never> {
  return { error };
}

// Função para criar resposta paginada
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

// Função para validar parâmetros de paginação
export function validatePaginationParams(
  pageParam?: string,
  limitParam?: string
): { page: number; limit: number } {
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(limitParam || '10', 10) || 10));
  
  return { page, limit };
}

// Função para calcular offset para paginação
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

// Função para formatar filtros de busca
export function buildSearchQuery(filters: Record<string, any>) {
  const query: Record<string, any> = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query[key] = value;
    }
  });
  
  return query;
}

// Função para validar CPF (básica)
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.length === 11 && !/^(\d)\1{10}$/.test(cleanCPF);
}

// Função para validar CNPJ (básica)
export function validateCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  return cleanCNPJ.length === 14 && !/^(\d)\1{13}$/.test(cleanCNPJ);
}

// Função para validar CPF ou CNPJ
export function validateCPFCNPJ(document: string): boolean {
  const cleanDoc = document.replace(/\D/g, '');
  
  if (cleanDoc.length === 11) {
    return validateCPF(cleanDoc);
  } else if (cleanDoc.length === 14) {
    return validateCNPJ(cleanDoc);
  }
  
  return false;
}

// Função para formatar valores monetários
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Função para formatar data
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

// Função para formatar CPF/CNPJ
export function formatCPFCNPJ(document: string): string {
  const cleanDoc = document.replace(/\D/g, '');
  
  if (cleanDoc.length === 11) {
    return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleanDoc.length === 14) {
    return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return document;
}

// Função para formatar telefone
export function formatPhone(phone: string): string {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

// Função para padronizar resposta de erro da API
export function handleApiError(error: unknown, defaultMessage: string = 'Erro interno do servidor') {
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    return NextResponse.json(
      createErrorResponse(error.message),
      { status: 400 }
    );
  }
  
  return NextResponse.json(
    createErrorResponse(defaultMessage),
    { status: 500 }
  );
}

// Função para validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Função para sanitizar string
export function sanitizeString(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}

// Função para validar UUID
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
} 