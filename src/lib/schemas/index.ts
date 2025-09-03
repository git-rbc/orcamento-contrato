// Exportar todos os schemas centralizados
export * from './common';
export * from './reuniao';
export * from './reserva';

// Re-exportar o Zod para facilitar uso
export { z } from 'zod';

// Utilitários de validação consolidados
import { formatZodError, createValidator } from './common';
import { z } from 'zod';

// Função universal para validação com feedback padronizado
export const validateWithFeedback = <T>(
  schema: z.ZodSchema<T>, 
  data: unknown,
  customMessage?: string
): { success: boolean; data?: T; error?: string } => {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = customMessage || `Dados inválidos: ${formatZodError(error)}`;
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Erro de validação desconhecido' };
  }
};

// Função para validação assíncrona (útil para validações que dependem de API)
export const validateAsync = async <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  customValidations?: ((data: T) => Promise<string | null>)[]
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    // Validação estrutural primeiro
    const validData = schema.parse(data);
    
    // Validações customizadas assíncronas
    if (customValidations && customValidations.length > 0) {
      for (const validation of customValidations) {
        const error = await validation(validData);
        if (error) {
          return { success: false, error };
        }
      }
    }
    
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: `Dados inválidos: ${formatZodError(error)}` };
    }
    return { success: false, error: 'Erro de validação desconhecido' };
  }
};

// Middleware para validação em APIs Next.js
export const createApiValidator = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown) => {
    const result = validateWithFeedback(schema, data);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data!;
  };
};

// Validações específicas para o negócio
export const businessValidations = {
  // Validar se a data não é no passado
  isNotPastDate: (date: string): boolean => {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate >= today;
  },

  // Validar se o horário de fim é depois do início
  isEndTimeAfterStart: (startTime: string, endTime: string): boolean => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes > startMinutes;
  },

  // Validar horário comercial (8h às 22h)
  isBusinessHours: (time: string): boolean => {
    const [hour] = time.split(':').map(Number);
    return hour >= 8 && hour <= 22;
  },

  // Validar duração mínima (30 minutos)
  hasMinimumDuration: (startTime: string, endTime: string, minMinutes: number = 30): boolean => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const duration = endMinutes - startMinutes;
    
    return duration >= minMinutes;
  }
};

// Schemas de validação para forms específicos do sistema
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export const profileUpdateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal(''))
});

// Tipos para os schemas específicos
export type LoginData = z.infer<typeof loginSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;