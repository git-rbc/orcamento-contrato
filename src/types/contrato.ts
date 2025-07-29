export interface ContratoTemplate {
  id: string;
  nome: string;
  descricao: string;
  conteudo: string;
  variaveis: TemplateVariable[];
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateVariable {
  nome: string;
  placeholder: string;
  tipo: 'texto' | 'data' | 'numero' | 'cliente' | 'evento';
  obrigatorio: boolean;
  valor_padrao?: string;
  descricao?: string;
}

export interface ContratoData {
  id?: string;
  numero_contrato: string;
  cliente_id: string;
  template_id: string;
  conteudo_original: string;
  conteudo_editado: string;
  data_contratacao: string;
  data_evento: string;
  local_evento: string;
  tipo_evento: string;
  numero_convidados: number;
  vendedor: string;
  status: 'rascunho' | 'enviado' | 'visualizado' | 'em_assinatura' | 'assinado' | 'finalizado' | 'cancelado';
  token_publico?: string;
  data_envio?: string;
  data_visualizacao?: string;
  data_assinatura?: string;
  arquivo_assinado?: string;
  created_at: string;
  updated_at: string;
}

export interface ContratoVariables {
  // Dados do cliente
  CLIENTE_NOME: string;
  CLIENTE_CPF_CNPJ: string;
  CLIENTE_TELEFONE: string;
  CLIENTE_EMAIL: string;
  CLIENTE_ENDERECO: string;
  CLIENTE_NUMERO: string;
  CLIENTE_BAIRRO: string;
  CLIENTE_CIDADE: string;
  CLIENTE_CEP: string;
  
  // Dados do evento
  TIPO_EVENTO: string;
  DATA_EVENTO: string;
  LOCAL_EVENTO: string;
  NUM_CONVIDADOS: string;
  ESPACO: string;
  SERVICOS: string;
  
  // Dados do contrato
  NUM_CONTRATO: string;
  DATA_CONTRATACAO: string;
  VENDEDOR: string;
  COD_REUNIAO: string;
  
  // Dados da empresa contratada
  CONTRATADA_NOME: string;
  CONTRATADA_CNPJ: string;
  EMPRESA_NOME: string;
  EMPRESA_CNPJ: string;
  EMPRESA_ENDERECO: string;
  EMPRESA_TELEFONE: string;
  EMPRESA_EMAIL: string;
}

export interface ContratoFormData {
  template_id: string;
  cliente_id: string;
  numero_contrato: string;
  data_contratacao: Date;
  data_evento: Date;
  local_evento: string;
  tipo_evento: string;
  numero_convidados: number;
  cod_reuniao: string;
  servicos: string;
  observacoes?: string;
}

export interface ContratoAssinatura {
  id: string;
  contrato_id: string;
  assinatura_id: string;
  ip_usuario: string;
  user_agent: string;
  assinatura_base64: string;
  timestamp_assinatura: string;
  dados_validados: {
    cpf_cnpj: string;
    nome_completo: string;
    tipo_documento: 'CPF' | 'CNPJ';
    timestamp_validacao: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ContratoPublico {
  id: string;
  numero_contrato: string;
  tipo_evento: string;
  data_evento: string;
  local_evento: string;
  numero_participantes: number;
  valor_total: string;
  status: string;
  observacoes: string;
  cliente: {
    nome: string;
    email: string;
    telefone: string;
    cpf_cnpj: string;
    tipo_pessoa: string;
    endereco: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    cep?: string;
  };
  data_criacao: string;
  data_visualizacao?: string;
}