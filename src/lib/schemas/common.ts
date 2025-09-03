import { z } from 'zod';

// Schemas comuns reutilizáveis
export const uuidSchema = z.string().uuid('Deve ser um UUID válido');

export const emailSchema = z.string().email('Email deve ter um formato válido');

export const phoneSchema = z.string()
  .min(10, 'Telefone deve ter pelo menos 10 dígitos')
  .max(15, 'Telefone deve ter no máximo 15 dígitos')
  .regex(/^[\d\s\(\)\-\+]+$/, 'Telefone deve conter apenas números e símbolos válidos');

export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD');

export const timeSchema = z.string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora deve estar no formato HH:MM');

export const colorSchema = z.string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor deve estar no formato hexadecimal (#000000)');

export const urlSchema = z.string().url('URL deve ser válida').or(z.literal(''));

// Schema para paginação
export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Página deve ser maior que 0').default(1),
  limit: z.number().int().min(1, 'Limite deve ser maior que 0').max(100, 'Limite máximo é 100').default(10),
  orderBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
});

// Schema para busca/filtros gerais
export const searchSchema = z.object({
  search: z.string().optional(),
  active: z.boolean().optional(),
  created_after: dateSchema.optional(),
  created_before: dateSchema.optional()
});

// Schema para resposta de API
export const apiResponseSchema = z.object({
  data: z.any(),
  message: z.string().optional(),
  success: z.boolean().default(true),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number()
  }).optional()
});

// Schema para resposta de erro
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  success: z.boolean().default(false),
  details: z.any().optional()
});

// Schemas para entidades comuns
export const clienteBaseSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome deve ter no máximo 200 caracteres'),
  email: emailSchema.optional(),
  telefone: phoneSchema.optional(),
  documento: z.string().optional(),
  tipo_pessoa: z.enum(['fisica', 'juridica']).default('fisica'),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  origem: z.string().optional(),
  campanha: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true)
});

export const vendedorBaseSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome deve ter no máximo 200 caracteres'),
  email: emailSchema,
  telefone: phoneSchema.optional(),
  documento: z.string().optional(),
  cargo: z.string().optional(),
  especialidade: z.string().optional(),
  comissao_padrao: z.number().min(0).max(100).optional(),
  meta_mensal: z.number().min(0).optional(),
  cor_agenda: colorSchema.optional(),
  ativo: z.boolean().default(true)
});

export const tipoEventoBaseSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  descricao: z.string().optional(),
  duracao_padrao_horas: z.number().min(0.5, 'Duração mínima é 0.5 horas').max(24, 'Duração máxima é 24 horas'),
  preco_base: z.number().min(0, 'Preço deve ser positivo').optional(),
  cor: colorSchema.optional(),
  categoria: z.string().optional(),
  capacidade_min: z.number().int().min(1).optional(),
  capacidade_max: z.number().int().min(1).optional(),
  ativo: z.boolean().default(true)
});

export const espacoEventoBaseSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  descricao: z.string().optional(),
  capacidade: z.number().int().min(1, 'Capacidade deve ser maior que 0'),
  preco_hora: z.number().min(0, 'Preço deve ser positivo').optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  equipamentos: z.array(z.string()).optional(),
  caracteristicas: z.array(z.string()).optional(),
  fotos: z.array(z.string().url()).optional(),
  disponivel_fins_semana: z.boolean().default(true),
  hora_abertura: timeSchema.optional(),
  hora_fechamento: timeSchema.optional(),
  ativo: z.boolean().default(true)
});

// Tipos TypeScript derivados dos schemas comuns
export type PaginationData = z.infer<typeof paginationSchema>;
export type SearchData = z.infer<typeof searchSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type ClienteBase = z.infer<typeof clienteBaseSchema>;
export type VendedorBase = z.infer<typeof vendedorBaseSchema>;
export type TipoEventoBase = z.infer<typeof tipoEventoBaseSchema>;
export type EspacoEventoBase = z.infer<typeof espacoEventoBaseSchema>;

// Utilitários de validação
export const validateUUID = (value: string): boolean => {
  try {
    uuidSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const validateEmail = (value: string): boolean => {
  try {
    emailSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const validateDate = (value: string): boolean => {
  try {
    dateSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const validateTime = (value: string): boolean => {
  try {
    timeSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

// Função para formatação de erros Zod
export const formatZodError = (error: z.ZodError): string => {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
};

// Função para criar validador genérico
export const createValidator = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${formatZodError(error)}`);
      }
      throw error;
    }
  };
};