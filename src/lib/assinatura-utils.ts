import crypto from 'crypto';

/**
 * Gera um ID único de assinatura no formato ASSIN-XXXX-XXXX-XXXX
 */
export function gerarIdAssinatura(): string {
  // Gera 12 caracteres aleatórios seguros
  const randomBytes = crypto.randomBytes(6);
  const randomString = randomBytes.toString('hex').toUpperCase();
  
  // Formata no padrão ASSIN-XXXX-XXXX-XXXX
  const parte1 = randomString.substring(0, 4);
  const parte2 = randomString.substring(4, 8);
  const parte3 = randomString.substring(8, 12);
  
  return `ASSIN-${parte1}-${parte2}-${parte3}`;
}

/**
 * Valida se um ID de assinatura está no formato correto
 */
export function validarIdAssinatura(id: string): boolean {
  const regex = /^ASSIN-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/;
  return regex.test(id);
}

/**
 * Valida CPF (algoritmo padrão brasileiro)
 */
export function validarCPF(cpf: string): boolean {
  // Remove formatação
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Calcula primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Calcula segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

/**
 * Valida CNPJ (algoritmo padrão brasileiro)
 */
export function validarCNPJ(cnpj: string): boolean {
  // Remove formatação
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Calcula primeiro dígito verificador
  let soma = 0;
  let peso = 2;
  for (let i = 11; i >= 0; i--) {
    soma += parseInt(cleanCNPJ.charAt(i)) * peso;
    peso++;
    if (peso === 10) peso = 2;
  }
  let resto = soma % 11;
  const dv1 = resto < 2 ? 0 : 11 - resto;
  if (dv1 !== parseInt(cleanCNPJ.charAt(12))) return false;
  
  // Calcula segundo dígito verificador
  soma = 0;
  peso = 2;
  for (let i = 12; i >= 0; i--) {
    soma += parseInt(cleanCNPJ.charAt(i)) * peso;
    peso++;
    if (peso === 10) peso = 2;
  }
  resto = soma % 11;
  const dv2 = resto < 2 ? 0 : 11 - resto;
  if (dv2 !== parseInt(cleanCNPJ.charAt(13))) return false;
  
  return true;
}

/**
 * Valida CPF ou CNPJ automaticamente
 */
export function validarCpfCnpj(documento: string): { valido: boolean; tipo: 'CPF' | 'CNPJ' | null } {
  const cleanDoc = documento.replace(/[^\d]/g, '');
  
  if (cleanDoc.length === 11) {
    return { valido: validarCPF(documento), tipo: 'CPF' };
  } else if (cleanDoc.length === 14) {
    return { valido: validarCNPJ(documento), tipo: 'CNPJ' };
  }
  
  return { valido: false, tipo: null };
}

/**
 * Formata CPF ou CNPJ para exibição
 */
export function formatarCpfCnpj(documento: string): string {
  const cleanDoc = documento.replace(/[^\d]/g, '');
  
  if (cleanDoc.length === 11) {
    // Formatar CPF: 000.000.000-00
    return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleanDoc.length === 14) {
    // Formatar CNPJ: 00.000.000/0000-00
    return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return documento;
}

/**
 * Normaliza nome para comparação (remove acentos, converte para minúsculo)
 */
export function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

/**
 * Compara nomes de forma flexível
 */
export function compararNomes(nome1: string, nome2: string): boolean {
  const nome1Norm = normalizarNome(nome1);
  const nome2Norm = normalizarNome(nome2);
  
  // Comparação exata
  if (nome1Norm === nome2Norm) return true;
  
  // Comparação com palavras em ordem diferente
  const palavras1 = nome1Norm.split(' ').sort();
  const palavras2 = nome2Norm.split(' ').sort();
  
  return palavras1.join(' ') === palavras2.join(' ');
}

/**
 * Gera hash da assinatura para verificação de integridade
 */
export function gerarHashAssinatura(assinaturaBase64: string, dadosValidados: any): string {
  const dados = JSON.stringify({ assinaturaBase64, dadosValidados });
  return crypto.createHash('sha256').update(dados).digest('hex');
}