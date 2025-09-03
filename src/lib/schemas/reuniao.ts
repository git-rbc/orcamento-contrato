import { z } from 'zod';

// Schema principal para reunião
export const reuniaoSchema = z.object({
  cliente_id: z.string().uuid('ID do cliente deve ser um UUID válido'),
  vendedor_id: z.string().uuid('ID do vendedor deve ser um UUID válido'),
  pre_vendedor_id: z.string().uuid().optional(),
  tipo_reuniao_id: z.string().uuid('Tipo de reunião é obrigatório'),
  espaco_evento_id: z.string().uuid().optional(),
  data: z.string().min(1, 'Data é obrigatória'),
  hora_inicio: z.string().min(1, 'Hora de início é obrigatória'),
  hora_fim: z.string().min(1, 'Hora de fim é obrigatória'),
  titulo: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
  link_reuniao: z.string().url().optional().or(z.literal('')),
  tipo_link: z.enum(['teams', 'zoom', 'google_meet', 'outro', '']).optional(),
  local_atendimento: z.string().optional(),
  cor_agenda: z.string().optional(),
  cupom_desconto_id: z.string().uuid().optional(),
  data_entrada_lead: z.string().optional(),
  reserva_temporaria_id: z.string().uuid().optional(),
  resumo_reuniao: z.string().optional()
});

// Schema para atualização de reunião (todos os campos opcionais exceto ID)
export const atualizarReuniaoSchema = z.object({
  id: z.string().uuid('ID da reunião deve ser um UUID válido'),
  cliente_id: z.string().uuid().optional(),
  vendedor_id: z.string().uuid().optional(),
  pre_vendedor_id: z.string().uuid().optional(),
  tipo_reuniao_id: z.string().uuid().optional(),
  espaco_evento_id: z.string().uuid().optional(),
  data: z.string().optional(),
  hora_inicio: z.string().optional(),
  hora_fim: z.string().optional(),
  titulo: z.string().min(1).max(200).optional(),
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
  link_reuniao: z.string().url().optional().or(z.literal('')),
  tipo_link: z.enum(['teams', 'zoom', 'google_meet', 'outro', '']).optional(),
  local_atendimento: z.string().optional(),
  cor_agenda: z.string().optional(),
  cupom_desconto_id: z.string().uuid().optional(),
  data_entrada_lead: z.string().optional(),
  reserva_temporaria_id: z.string().uuid().optional(),
  resumo_reuniao: z.string().optional(),
  status: z.enum(['agendada', 'confirmada', 'cancelada', 'reagendada', 'concluida']).optional()
});

// Schema para confirmação de reunião
export const confirmarReuniaoSchema = z.object({
  id: z.string().uuid('ID da reunião deve ser um UUID válido'),
  tipo_confirmacao: z.enum(['cliente', 'vendedor'], {
    errorMap: () => ({ message: 'Tipo de confirmação deve ser "cliente" ou "vendedor"' })
  })
});

// Schema para reagendamento
export const reagendarReuniaoSchema = z.object({
  id: z.string().uuid('ID da reunião deve ser um UUID válido'),
  nova_data: z.string().min(1, 'Nova data é obrigatória'),
  nova_hora_inicio: z.string().min(1, 'Nova hora de início é obrigatória'),
  nova_hora_fim: z.string().min(1, 'Nova hora de fim é obrigatória'),
  motivo: z.string().optional()
});

// Schema para filtros de reunião
export const filtrosReuniaoSchema = z.object({
  vendedorId: z.string().uuid().optional(),
  clienteId: z.string().uuid().optional(),
  status: z.string().optional(),
  tipoReuniaoId: z.string().uuid().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  search: z.string().optional(),
  preVendedorId: z.string().uuid().optional(),
  localAtendimento: z.string().optional(),
  origem: z.string().optional(),
  campanha: z.string().optional(),
  confirmada: z.boolean().optional()
});

// Schema para resultado de reunião
export const resultadoReuniaoSchema = z.object({
  reuniao_id: z.string().uuid('ID da reunião deve ser um UUID válido'),
  resultado: z.enum(['sucesso', 'reagendamento', 'cancelamento', 'conversao', 'sem_interesse', 'follow_up', 'proposta_enviada']),
  valor_estimado_negocio: z.number().min(0, 'Valor deve ser positivo').default(0),
  proximos_passos: z.string().optional(),
  data_follow_up: z.string().optional(),
  observacoes: z.string().optional()
});

// Schema para disponibilidade
export const verificarDisponibilidadeSchema = z.object({
  vendedor_id: z.string().uuid('ID do vendedor deve ser um UUID válido'),
  data: z.string().min(1, 'Data é obrigatória'),
  hora_inicio: z.string().min(1, 'Hora de início é obrigatória'),
  hora_fim: z.string().min(1, 'Hora de fim é obrigatória'),
  excludeReuniaoId: z.string().uuid().optional()
});

// Tipos TypeScript derivados dos schemas
export type ReuniaoFormData = z.infer<typeof reuniaoSchema>;
export type AtualizarReuniaoData = z.infer<typeof atualizarReuniaoSchema>;
export type ConfirmarReuniaoData = z.infer<typeof confirmarReuniaoSchema>;
export type ReagendarReuniaoData = z.infer<typeof reagendarReuniaoSchema>;
export type FiltrosReuniaoData = z.infer<typeof filtrosReuniaoSchema>;
export type ResultadoReuniaoData = z.infer<typeof resultadoReuniaoSchema>;
export type VerificarDisponibilidadeData = z.infer<typeof verificarDisponibilidadeSchema>;

// Funções de validação com tratamento de erro customizado
export const validarReuniao = (data: unknown): ReuniaoFormData => {
  try {
    return reuniaoSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new Error(`Dados inválidos da reunião: ${messages}`);
    }
    throw error;
  }
};

export const validarAtualizarReuniao = (data: unknown): AtualizarReuniaoData => {
  try {
    return atualizarReuniaoSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new Error(`Dados inválidos para atualização: ${messages}`);
    }
    throw error;
  }
};

export const validarConfirmarReuniao = (data: unknown): ConfirmarReuniaoData => {
  try {
    return confirmarReuniaoSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new Error(`Dados inválidos para confirmação: ${messages}`);
    }
    throw error;
  }
};