import { z } from 'zod';

// Schema principal para reserva
export const reservaSchema = z.object({
  cliente_id: z.string().uuid('ID do cliente deve ser um UUID válido'),
  vendedor_id: z.string().uuid('ID do vendedor deve ser um UUID válido'),
  pre_vendedor_id: z.string().uuid().optional(),
  tipo_evento_id: z.string().uuid('Tipo de evento é obrigatório'),
  espaco_evento_id: z.string().uuid('Espaço do evento é obrigatório'),
  data_evento: z.string().min(1, 'Data do evento é obrigatória'),
  hora_inicio: z.string().min(1, 'Hora de início é obrigatória'),
  hora_fim: z.string().min(1, 'Hora de fim é obrigatória'),
  titulo: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
  numero_convidados: z.number().int().min(1, 'Deve ter pelo menos 1 convidado').max(1000, 'Máximo 1000 convidados'),
  valor_estimado: z.number().min(0, 'Valor deve ser positivo').optional(),
  status_pagamento: z.enum(['pendente', 'pago', 'parcial', 'cancelado']).default('pendente'),
  forma_pagamento: z.string().optional(),
  data_vencimento: z.string().optional(),
  contrato_assinado: z.boolean().default(false),
  necessidades_especiais: z.string().optional(),
  decoracao_especial: z.string().optional(),
  cardapio_id: z.string().uuid().optional(),
  servicos_extras: z.array(z.string()).optional(),
  contato_responsavel: z.string().optional(),
  telefone_contato: z.string().optional(),
  email_contato: z.string().email().optional()
});

// Schema para atualização de reserva
export const atualizarReservaSchema = z.object({
  id: z.string().uuid('ID da reserva deve ser um UUID válido'),
  cliente_id: z.string().uuid().optional(),
  vendedor_id: z.string().uuid().optional(),
  pre_vendedor_id: z.string().uuid().optional(),
  tipo_evento_id: z.string().uuid().optional(),
  espaco_evento_id: z.string().uuid().optional(),
  data_evento: z.string().optional(),
  hora_inicio: z.string().optional(),
  hora_fim: z.string().optional(),
  titulo: z.string().min(1).max(200).optional(),
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
  numero_convidados: z.number().int().min(1).max(1000).optional(),
  valor_estimado: z.number().min(0).optional(),
  status_pagamento: z.enum(['pendente', 'pago', 'parcial', 'cancelado']).optional(),
  forma_pagamento: z.string().optional(),
  data_vencimento: z.string().optional(),
  contrato_assinado: z.boolean().optional(),
  necessidades_especiais: z.string().optional(),
  decoracao_especial: z.string().optional(),
  cardapio_id: z.string().uuid().optional(),
  servicos_extras: z.array(z.string()).optional(),
  contato_responsavel: z.string().optional(),
  telefone_contato: z.string().optional(),
  email_contato: z.string().email().optional(),
  status: z.enum(['agendada', 'confirmada', 'cancelada', 'reagendada', 'concluida']).optional()
});

// Schema para confirmar reserva
export const confirmarReservaSchema = z.object({
  id: z.string().uuid('ID da reserva deve ser um UUID válido'),
  tipo_confirmacao: z.enum(['cliente', 'vendedor'], {
    errorMap: () => ({ message: 'Tipo de confirmação deve ser "cliente" ou "vendedor"' })
  })
});

// Schema para reagendamento de reserva
export const reagendarReservaSchema = z.object({
  id: z.string().uuid('ID da reserva deve ser um UUID válido'),
  nova_data: z.string().min(1, 'Nova data é obrigatória'),
  nova_hora_inicio: z.string().min(1, 'Nova hora de início é obrigatória'),
  nova_hora_fim: z.string().min(1, 'Nova hora de fim é obrigatória'),
  novo_espaco_id: z.string().uuid().optional(),
  motivo: z.string().optional()
});

// Schema para filtros de reserva
export const filtrosReservaSchema = z.object({
  vendedorId: z.string().uuid().optional(),
  clienteId: z.string().uuid().optional(),
  espacoId: z.string().uuid().optional(),
  tipoEventoId: z.string().uuid().optional(),
  status: z.string().optional(),
  statusPagamento: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  search: z.string().optional(),
  contratoAssinado: z.boolean().optional(),
  valorMin: z.number().min(0).optional(),
  valorMax: z.number().min(0).optional()
});

// Schema para bloqueio de espaço
export const bloqueioEspacoSchema = z.object({
  espaco_evento_id: z.string().uuid('ID do espaço deve ser um UUID válido'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().min(1, 'Data de fim é obrigatória'),
  hora_inicio: z.string().min(1, 'Hora de início é obrigatória'),
  hora_fim: z.string().min(1, 'Hora de fim é obrigatória'),
  motivo: z.string().min(1, 'Motivo é obrigatório'),
  observacoes: z.string().optional(),
  tipo_bloqueio: z.enum(['manutencao', 'evento_interno', 'reforma', 'outro']).default('outro'),
  created_by: z.string().uuid('ID do usuário deve ser um UUID válido')
});

// Schema para verificar disponibilidade de espaço
export const verificarDisponibilidadeEspacoSchema = z.object({
  espaco_evento_id: z.string().uuid('ID do espaço deve ser um UUID válido'),
  data_evento: z.string().min(1, 'Data do evento é obrigatória'),
  hora_inicio: z.string().min(1, 'Hora de início é obrigatória'),
  hora_fim: z.string().min(1, 'Hora de fim é obrigatória'),
  excludeReservaId: z.string().uuid().optional()
});

// Tipos TypeScript derivados dos schemas
export type ReservaFormData = z.infer<typeof reservaSchema>;
export type AtualizarReservaData = z.infer<typeof atualizarReservaSchema>;
export type ConfirmarReservaData = z.infer<typeof confirmarReservaSchema>;
export type ReagendarReservaData = z.infer<typeof reagendarReservaSchema>;
export type FiltrosReservaData = z.infer<typeof filtrosReservaSchema>;
export type BloqueioEspacoData = z.infer<typeof bloqueioEspacoSchema>;
export type VerificarDisponibilidadeEspacoData = z.infer<typeof verificarDisponibilidadeEspacoSchema>;

// Funções de validação com tratamento de erro customizado
export const validarReserva = (data: unknown): ReservaFormData => {
  try {
    return reservaSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new Error(`Dados inválidos da reserva: ${messages}`);
    }
    throw error;
  }
};

export const validarAtualizarReserva = (data: unknown): AtualizarReservaData => {
  try {
    return atualizarReservaSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new Error(`Dados inválidos para atualização: ${messages}`);
    }
    throw error;
  }
};

export const validarBloqueioEspaco = (data: unknown): BloqueioEspacoData => {
  try {
    return bloqueioEspacoSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new Error(`Dados inválidos para bloqueio: ${messages}`);
    }
    throw error;
  }
};