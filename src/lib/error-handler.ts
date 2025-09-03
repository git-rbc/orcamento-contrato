import { toast } from '@/components/ui/use-toast';

// Tipos para diferentes tipos de erro
export type ErrorType = 'validation' | 'network' | 'permission' | 'conflict' | 'not_found' | 'server' | 'unknown';

// Interface para erro estruturado
export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  field?: string;
}

// Classe personalizada de erro
export class BusinessError extends Error {
  public type: ErrorType;
  public details?: any;
  public field?: string;

  constructor(message: string, type: ErrorType = 'unknown', details?: any, field?: string) {
    super(message);
    this.name = 'BusinessError';
    this.type = type;
    this.details = details;
    this.field = field;
  }
}

// Funções para criar erros específicos
export const createValidationError = (message: string, field?: string): BusinessError => {
  return new BusinessError(message, 'validation', null, field);
};

export const createNetworkError = (message: string = 'Erro de conexão'): BusinessError => {
  return new BusinessError(message, 'network');
};

export const createPermissionError = (message: string = 'Sem permissão para realizar esta ação'): BusinessError => {
  return new BusinessError(message, 'permission');
};

export const createConflictError = (message: string, details?: any): BusinessError => {
  return new BusinessError(message, 'conflict', details);
};

export const createNotFoundError = (resource: string = 'Item'): BusinessError => {
  return new BusinessError(`${resource} não encontrado`, 'not_found');
};

export const createServerError = (message: string = 'Erro interno do servidor'): BusinessError => {
  return new BusinessError(message, 'server');
};

// Handler central de erros
export const handleError = (error: unknown, context?: string): AppError => {
  console.error('Error occurred:', error, context ? `Context: ${context}` : '');
  
  // Se já é um BusinessError, retornar como AppError
  if (error instanceof BusinessError) {
    return {
      type: error.type,
      message: error.message,
      details: error.details,
      field: error.field
    };
  }
  
  // Se é um Error padrão
  if (error instanceof Error) {
    // Tentar detectar o tipo baseado na mensagem
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return { type: 'network', message: 'Erro de conexão com o servidor' };
    }
    
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return { type: 'permission', message: 'Sem permissão para realizar esta ação' };
    }
    
    if (message.includes('conflict') || message.includes('já existe') || message.includes('conflito')) {
      return { type: 'conflict', message: error.message };
    }
    
    if (message.includes('not found') || message.includes('não encontrado')) {
      return { type: 'not_found', message: error.message };
    }
    
    if (message.includes('validation') || message.includes('inválido') || message.includes('obrigatório')) {
      return { type: 'validation', message: error.message };
    }
    
    return { type: 'unknown', message: error.message };
  }
  
  // Para outros tipos de erro
  return { 
    type: 'unknown', 
    message: typeof error === 'string' ? error : 'Erro desconhecido' 
  };
};

// Função para mostrar toast baseado no tipo de erro
export const showErrorToast = (error: AppError | unknown, context?: string): void => {
  const appError = error instanceof Error || typeof error === 'string' || (error as any)?.type 
    ? (error as any).type ? error as AppError : handleError(error, context)
    : handleError(error, context);
  
  const getToastVariant = (type: ErrorType): "default" | "destructive" => {
    switch (type) {
      case 'validation':
      case 'permission':
      case 'conflict':
      case 'not_found':
        return 'destructive';
      case 'network':
      case 'server':
      case 'unknown':
      default:
        return 'destructive';
    }
  };
  
  const getToastTitle = (type: ErrorType): string => {
    switch (type) {
      case 'validation':
        return 'Dados Inválidos';
      case 'network':
        return 'Erro de Conexão';
      case 'permission':
        return 'Sem Permissão';
      case 'conflict':
        return 'Conflito';
      case 'not_found':
        return 'Não Encontrado';
      case 'server':
        return 'Erro do Servidor';
      case 'unknown':
      default:
        return 'Erro';
    }
  };
  
  toast({
    title: getToastTitle(appError.type),
    description: appError.message,
    variant: getToastVariant(appError.type)
  });
};

// Função para mostrar toast de sucesso
export const showSuccessToast = (message: string, title: string = 'Sucesso!'): void => {
  toast({
    title,
    description: message
  });
};

// Função para mostrar toast de aviso
export const showWarningToast = (message: string, title: string = 'Aviso'): void => {
  toast({
    title,
    description: message,
    variant: 'default'
  });
};

// Handler para APIs fetch
export const handleApiResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  let data;
  try {
    data = isJson ? await response.json() : await response.text();
  } catch (parseError) {
    throw createServerError('Erro ao processar resposta do servidor');
  }
  
  if (!response.ok) {
    const message = isJson && data.error ? data.error : data || 'Erro na requisição';
    
    switch (response.status) {
      case 400:
        throw createValidationError(message);
      case 401:
      case 403:
        throw createPermissionError(message);
      case 404:
        throw createNotFoundError(message);
      case 409:
        throw createConflictError(message, data.details);
      case 500:
      case 502:
      case 503:
      case 504:
        throw createServerError(message);
      default:
        throw new BusinessError(message, 'unknown');
    }
  }
  
  return data;
};

// Wrapper para funções assíncronas com tratamento de erro
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = handleError(error, context);
      showErrorToast(appError, context);
      throw error; // Re-throw para permitir handling específico se necessário
    }
  };
};

// Utilitário para debugging
export const logError = (error: unknown, context?: string): void => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔴 Error ${context ? `in ${context}` : ''}`);
    console.error('Error:', error);
    if (error instanceof BusinessError) {
      console.log('Type:', error.type);
      console.log('Details:', error.details);
      console.log('Field:', error.field);
    }
    console.groupEnd();
  }
};