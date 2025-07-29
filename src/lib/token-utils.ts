import { randomBytes } from 'crypto';

/**
 * Gera um token público único para proposta
 * Formato: 8 caracteres alfanuméricos em maiúscula
 */
export function gerarTokenPublico(): string {
  // Usar timestamp + random para garantir unicidade
  const timestamp = Date.now().toString(36);
  const random = randomBytes(6).toString('hex');
  
  // Combinar e pegar apenas 8 caracteres alfanuméricos
  const combined = (timestamp + random).replace(/[^a-z0-9]/gi, '');
  const token = combined.substring(0, 8).toUpperCase();
  
  // Garantir que tenha 8 caracteres
  if (token.length < 8) {
    const extraRandom = randomBytes(4).toString('hex').toUpperCase();
    return (token + extraRandom).substring(0, 8);
  }
  
  return token;
}

/**
 * Valida se um token tem o formato correto
 */
export function validarTokenPublico(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  
  // Deve ter exatamente 8 caracteres alfanuméricos
  const tokenRegex = /^[A-Z0-9]{8}$/;
  return tokenRegex.test(token);
}

/**
 * Gera URL pública da proposta
 */
export function gerarUrlPublicaProposta(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/proposta/${token}`;
}

/**
 * Gera URL para recursos estáticos (imagens, logos)
 */
export function gerarUrlRecursoEstatico(caminho: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  // Remove barra inicial se existir para evitar dupla barra
  const path = caminho.startsWith('/') ? caminho.substring(1) : caminho;
  return `${base}/${path}`;
}