import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para gerar senha segura automática
export function gerarSenhaAutomatica(tamanho: number = 12): string {
  const maiusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const numeros = '0123456789';
  const simbolos = '!@#$%&*';
  
  const todosCaracteres = maiusculas + minusculas + numeros + simbolos;
  
  let senha = '';
  
  // Garantir pelo menos um de cada tipo
  senha += maiusculas[Math.floor(Math.random() * maiusculas.length)];
  senha += minusculas[Math.floor(Math.random() * minusculas.length)];
  senha += numeros[Math.floor(Math.random() * numeros.length)];
  senha += simbolos[Math.floor(Math.random() * simbolos.length)];
  
  // Preencher o resto aleatoriamente
  for (let i = 4; i < tamanho; i++) {
    senha += todosCaracteres[Math.floor(Math.random() * todosCaracteres.length)];
  }
  
  // Embaralhar a senha
  return senha.split('').sort(() => 0.5 - Math.random()).join('');
}

// Função para copiar para clipboard
export async function copiarParaClipboard(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch (error) {
    // Fallback para navegadores mais antigos
    const textArea = document.createElement('textarea');
    textArea.value = texto;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

// Função para formatar moeda brasileira
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Função para formatar CPF/CNPJ
export function formatCPFCNPJ(value?: string | null): string {
  // Verificar se o valor é válido
  if (!value || typeof value !== 'string') {
    return '';
  }
  
  // Remove tudo que não é dígito
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length === 11) {
    // CPF: 000.000.000-00
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleanValue.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return value;
}

// Função para formatar telefone
export function formatPhone(value?: string | null): string {
  // Verificar se o valor é válido
  if (!value || typeof value !== 'string') {
    return '';
  }
  
  // Remove tudo que não é dígito
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length === 0) return '';
  
  if (cleanValue.length === 10) {
    // Telefone fixo: (00) 0000-0000
    return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanValue.length === 11) {
    // Celular: (00) 00000-0000
    return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  return value;
}

// Função para formatar CEP
export function formatCEP(value?: string | null): string {
  // Verificar se o valor é válido
  if (!value || typeof value !== 'string') {
    return '';
  }
  
  // Remove tudo que não é dígito
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length === 0) return '';
  
  // CEP: 00000-000
  if (cleanValue.length <= 8) {
    return cleanValue
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  }
  
  return value;
}

// Função para validar CPF
export function isValidCPF(cpf?: string | null): boolean {
  // Verificar se o valor é válido
  if (!cpf || typeof cpf !== 'string') {
    return false;
  }
  
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(.)\1*$/.test(cleanCPF)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
}

// Função para validar CNPJ
export function isValidCNPJ(cnpj?: string | null): boolean {
  // Verificar se o valor é válido
  if (!cnpj || typeof cnpj !== 'string') {
    return false;
  }
  
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  if (/^(.)\1*$/.test(cleanCNPJ)) return false;
  
  let sum = 0;
  let remainder;
  
  // Primeira validação
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * ((i < 4) ? (5 - i) : (13 - i));
  }
  
  remainder = sum % 11;
  remainder = (remainder < 2) ? 0 : 11 - remainder;
  if (remainder !== parseInt(cleanCNPJ.charAt(12))) return false;
  
  // Segunda validação
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * ((i < 5) ? (6 - i) : (14 - i));
  }
  
  remainder = sum % 11;
  remainder = (remainder < 2) ? 0 : 11 - remainder;
  if (remainder !== parseInt(cleanCNPJ.charAt(13))) return false;
  
  return true;
}

// Função para validar email
export function isValidEmail(email?: string | null): boolean {
  // Verificar se o valor é válido
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Função para formatar data
export function formatDate(date?: string | Date | null): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR').format(dateObj);
  } catch (error) {
    return '';
  }
}

// Função para formatar data e hora
export function formatDateTime(date?: string | Date | null): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch (error) {
    return '';
  }
}
