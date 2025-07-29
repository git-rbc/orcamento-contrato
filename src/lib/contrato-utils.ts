import { ContratoVariables, ContratoTemplate, ContratoFormData } from '@/types/contrato';
import { ClienteData } from '@/components/contratos/novo-contrato';

export function criarVariaveisContrato(
  clienteData: ClienteData | null,
  formData: ContratoFormData
): ContratoVariables {
  const formatarData = (date: Date | string): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pt-BR');
  };

  return {
    // Dados do cliente
    CLIENTE_NOME: clienteData?.nome || '',
    CLIENTE_CPF_CNPJ: clienteData?.cpf_cnpj || '',
    CLIENTE_TELEFONE: clienteData?.telefone || '',
    CLIENTE_EMAIL: clienteData?.email || '',
    CLIENTE_ENDERECO: clienteData?.endereco || '',
    CLIENTE_NUMERO: clienteData?.numero || '',
    CLIENTE_BAIRRO: clienteData?.bairro || '',
    CLIENTE_CIDADE: clienteData?.cidade || '',
    CLIENTE_CEP: clienteData?.cep || '',
    
    // Dados do evento
    TIPO_EVENTO: formData.tipo_evento || '',
    DATA_EVENTO: formatarData(formData.data_evento),
    LOCAL_EVENTO: formData.local_evento || '',
    NUM_CONVIDADOS: formData.numero_convidados?.toString() || '',
    ESPACO: formData.local_evento || '',
    SERVICOS: formData.servicos || '',
    
    // Dados do contrato
    NUM_CONTRATO: formData.numero_contrato || '',
    DATA_CONTRATACAO: formatarData(formData.data_contratacao),
    VENDEDOR: '', // Será preenchido com o usuário que gerou o contrato
    COD_REUNIAO: formData.cod_reuniao || '',
    
    // Dados da empresa contratada
    CONTRATADA_NOME: 'INDEX02 EVENTOS LTDA.',
    CONTRATADA_CNPJ: '30.969.797/0001-09',
    EMPRESA_NOME: 'INDEX02 EVENTOS LTDA.',
    EMPRESA_CNPJ: '30.969.797/0001-09',
    EMPRESA_ENDERECO: '',
    EMPRESA_TELEFONE: '',
    EMPRESA_EMAIL: ''
  };
}

export function substituirVariaveis(
  template: string,
  variaveis: ContratoVariables
): string {
  let conteudo = template;
  
  // Substituir cada variável no template
  Object.entries(variaveis).forEach(([chave, valor]) => {
    const placeholder = `{{${chave}}}`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    conteudo = conteudo.replace(regex, valor || '');
  });
  
  return conteudo;
}

export function extrairVariaveis(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variaveis: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    if (!variaveis.includes(match[1])) {
      variaveis.push(match[1]);
    }
  }
  
  return variaveis;
}

export function validarTemplate(template: ContratoTemplate): string[] {
  const erros: string[] = [];
  
  if (!template.nome.trim()) {
    erros.push('Nome do template é obrigatório');
  }
  
  if (!template.conteudo.trim()) {
    erros.push('Conteúdo do template é obrigatório');
  }
  
  // Validar se todas as variáveis definidas existem no conteúdo
  const variaveisNoConteudo = extrairVariaveis(template.conteudo);
  const variaveisDefinidas = template.variaveis.map(v => v.nome);
  
  variaveisDefinidas.forEach(variavel => {
    if (!variaveisNoConteudo.includes(variavel)) {
      erros.push(`Variável ${variavel} está definida mas não é usada no template`);
    }
  });
  
  variaveisNoConteudo.forEach(variavel => {
    if (!variaveisDefinidas.includes(variavel)) {
      erros.push(`Variável ${variavel} é usada no template mas não está definida`);
    }
  });
  
  return erros;
}

export function formatarConteudoParaEditor(conteudo: string): string {
  // Converter quebras de linha para HTML
  return conteudo
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.)/g, '<p>$1')
    .replace(/(.)$/g, '$1</p>');
}

export function formatarConteudoParaTexto(html: string): string {
  // Converter HTML para texto simples
  return html
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<br>/g, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}

export function gerarNumeroContrato(clienteNome: string, clienteId: string): string {
  const ano = new Date().getFullYear();
  const iniciais = clienteNome.substring(0, 3).toUpperCase();
  const idParte = clienteId.substring(0, 4).toUpperCase();
  
  return `C-${ano}-${iniciais}-${idParte}`;
}