// Tipos base
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Tipo para usuários
export interface User extends BaseEntity {
  email: string;
  nome: string;
  role: 'admin' | 'vendedor';
  role_id?: string; // Nova referência ao sistema de roles dinâmicos
  ativo: boolean;
}

// =====================================================
// NOVOS TIPOS PARA SISTEMA DE ADMINISTRAÇÃO AVANÇADO
// =====================================================

// Tipo para roles dinâmicos
export interface Role {
  id: string;
  nome: string;
  descricao?: string;
  cor: string;
  nivel_hierarquia: number;
  ativo: boolean;
  sistema: boolean;
  created_at: string;
  updated_at: string;
}

// Tipo para permissões
export interface Permissao {
  id: string;
  modulo: string;
  acao: string;
  nome: string;
  descricao?: string;
  created_at: string;
}

// Tipo para relacionamento role-permissões
export interface RolePermissao {
  id: string;
  role_id: string;
  permissao_id: string;
  concedida: boolean;
  created_at: string;
  
  // Relacionamentos
  role?: Role;
  permissao?: Permissao;
}

// Tipo para menus
export interface Menu {
  id: string;
  nome: string;
  slug: string;
  icone?: string;
  url?: string;
  parent_id?: string;
  ordem: number;
  ativo: boolean;
  sistema: boolean;
  created_at: string;
  
  // Relacionamentos
  parent?: Menu;
  children?: Menu[];
}

// Tipo para categorias de produtos
export interface CategoriaProduto {
  id: string;
  nome: string;
  descricao?: string;
  tem_taxa_padrao: boolean;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Tipo para produtos
export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  categoria_id: string;
  categoria_nome: string;
  status: string;
  reajuste: boolean;
  valor: number;
  tem_taxa: boolean;
  descricao?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  desconto_percentual?: number;
  
  // Relacionamentos
  categoria?: CategoriaProduto;
  espacos?: { espaco: EspacoEvento }[];
}

// Tipo para relacionamento role-menus
export interface RoleMenu {
  id: string;
  role_id: string;
  menu_id: string;
  visivel: boolean;
  created_at: string;
  
  // Relacionamentos
  role?: Role;
  menu?: Menu;
}

// Tipo para logs administrativos
export interface AdminLog {
  id: string;
  admin_id: string;
  acao: string;
  recurso: string;
  recurso_id?: string;
  detalhes?: any; // JSONB
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  
  // Relacionamentos
  admin?: User;
}

// Tipo para usuário completo com role e permissões
export interface UserComplete extends User {
  role_info?: {
    id: string;
    nome: string;
    descricao?: string;
    cor: string;
    nivel_hierarquia: number;
  };
  permissoes?: string[]; // array de "modulo.acao"
  menus?: Menu[];
}

// =====================================================
// DTOs PARA SISTEMA DE ADMINISTRAÇÃO
// =====================================================

export interface CreateRoleDTO {
  nome: string;
  descricao?: string;
  cor?: string;
  nivel_hierarquia?: number;
  ativo?: boolean;
}

export interface UpdateRoleDTO {
  nome?: string;
  descricao?: string;
  cor?: string;
  nivel_hierarquia?: number;
  ativo?: boolean;
}

export interface CreateUserDTO {
  email: string;
  nome: string;
  role_id: string;
  password?: string; // Para criação manual
  ativo?: boolean;
}

export interface UpdateUserDTO {
  nome?: string;
  role_id?: string;
  ativo?: boolean;
}

export interface RolePermissionsDTO {
  role_id: string;
  permissoes: {
    permissao_id: string;
    concedida: boolean;
  }[];
}

export interface RoleMenusDTO {
  role_id: string;
  menus: {
    menu_id: string;
    visivel: boolean;
  }[];
}

export interface CreateMenuDTO {
  nome: string;
  slug: string;
  icone?: string;
  url?: string;
  parent_id?: string;
  ordem?: number;
  ativo?: boolean;
}

export interface UpdateMenuDTO {
  nome?: string;
  slug?: string;
  icone?: string;
  url?: string;
  parent_id?: string;
  ordem?: number;
  ativo?: boolean;
}

// =====================================================
// TIPOS EXISTENTES (mantidos)
// =====================================================

// Tipo para clientes  
export interface Cliente extends BaseEntity {
  codigo: string;
  nome: string;
  nome_secundario?: string;
  cpf_cnpj: string;
  cpf_cnpj_secundario?: string;
  email?: string;
  email_secundario?: string;
  telefone?: string;
  telefone_secundario?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  origem?: string;
  campanha?: string;
  observacoes?: string;
  ativo: boolean;
}

// Tipo para tipos de decoração
export interface TipoDecoracao extends BaseEntity {
  nome: string;
  valor: number;
  espaco_evento_id: string;
  dia_semana: 'segunda_quinta' | 'sexta' | 'sabado' | 'domingo' | 'feriados_vesperas';
  ativo: boolean;
  
  // Relacionamento
  espacos_eventos?: {
    id: string;
    nome: string;
  };
}


// Tipos para serviços template
export interface ServicoTemplate extends BaseEntity {
  nome: string;
  descricao?: string;
  tipo_calculo: 'percentual_produtos' | 'valor_fixo_ambiente' | 'por_convidados' | 'valor_minimo_ambiente' | 'valor_minimo_ambiente_dia' | 'reajuste_temporal';
  ativo: boolean;
  ordem: number;
  parametros?: ServicoParametro[];
}

export interface ServicoParametro {
  id: string;
  servico_id: string;
  chave: string;
  valor: string;
  tipo_dado: 'number' | 'text' | 'boolean';
  created_at: string;
}

export interface UpdateServicoTemplateDTO {
  nome?: string;
  descricao?: string;
  ativo?: boolean;
  parametros?: {
    chave: string;
    valor: string;
    tipo_dado: 'number' | 'text' | 'boolean';
  }[];
}

// Tipo para contratos
export interface Contrato extends BaseEntity {
  numero_contrato: string;
  cliente_id: string;
  vendedor_id: string;
  tipo_evento?: string;
  data_evento?: string;
  local_evento?: string;
  numero_participantes?: number;
  valor_total: number;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'assinado' | 'cancelado' | 'finalizado';
  data_criacao: string;
  data_envio?: string;
  data_assinatura?: string;
  observacoes?: string;
  arquivo_pdf?: string;
  arquivo_assinado?: string;
  
  // Relacionamentos
  cliente?: Cliente;
  vendedor?: User;
}


// Tipo para histórico de contratos
export interface ContratoHistorico {
  id: string;
  contrato_id: string;
  usuario_id: string;
  acao: string;
  descricao: string;
  dados_anteriores?: any;
  dados_novos?: any;
  created_at: string;
  
  // Relacionamentos
  usuario?: User;
}

// DTOs para criação/atualização
export interface CreateClienteDTO {
  nome: string;
  nome_secundario?: string;
  cpf_cnpj: string;
  cpf_cnpj_secundario?: string;
  email?: string;
  email_secundario?: string;
  telefone?: string;
  telefone_secundario?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  origem?: string;
  campanha?: string;
  observacoes?: string;
  ativo?: boolean;
}

export interface UpdateClienteDTO {
  nome?: string;
  nome_secundario?: string;
  cpf_cnpj?: string;
  cpf_cnpj_secundario?: string;
  email?: string;
  email_secundario?: string;
  telefone?: string;
  telefone_secundario?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  origem?: string;
  campanha?: string;
  observacoes?: string;
  ativo?: boolean;
}



// DTOs para tipos de decoração
export interface CreateTipoDecoracaoDTO {
  nome: string;
  valor?: number;
  espaco_evento_id: string;
  dia_semana?: 'segunda_quinta' | 'sexta' | 'sabado' | 'domingo' | 'feriados_vesperas';
  ativo?: boolean;
}

export interface UpdateTipoDecoracaoDTO {
  nome?: string;
  valor?: number;
  espaco_evento_id?: string;
  dia_semana?: 'segunda_quinta' | 'sexta' | 'sabado' | 'domingo' | 'feriados_vesperas';
  ativo?: boolean;
}

// Tipo para filtros
export interface ClienteFilters {
  codigo?: string;
  nome?: string;
  cpf_cnpj?: string;
  email?: string;
  cidade?: string;
  ativo?: boolean;
  tipo_pessoa?: 'pessoa_fisica' | 'empresa';
  page?: number;
  limit?: number;
}


export interface AdminFilters {
  role_id?: string;
  ativo?: boolean;
  search?: string; // busca em nome ou email
}

export interface LogFilters {
  admin_id?: string;
  acao?: string;
  recurso?: string;
  data_inicio?: string;
  data_fim?: string;
}

// Tipo para resposta paginada
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Tipo para respostas da API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// ESPAÇOS/EVENTOS
// ============================================

// Espaços para Eventos
export interface EspacoEvento {
  id: string;
  nome: string;
  cidade: string;
  capacidade_maxima: number;
  descricao?: string | null;
  tem_espaco_kids: boolean;
  tem_pista_led: boolean;
  tem_centro_better: boolean;
  tipo_cadeira?: string | null;
  tipo_decorativo?: string | null;
  ativo: boolean;
  ordem: number;
  cor: string;
  created_at: string;
  updated_at: string;
  layouts?: EspacoEventoLayout[]; // Adicionar relacionamento
}

export type LayoutTipo = 
  | 'ESTILO_BALADA'
  | 'AUDITORIO'
  | 'COQUETEL'
  | 'CERIMONIA_INTERNA'
  | 'SOMENTE_JANTAR'
  | 'CERIMONIA_INTERNA_EXTERNA'
  | 'CERIMONIA_EXTERNA';

export interface EspacoEventoLayout {
  id: string;
  espaco_id: string;
  layout: LayoutTipo;
  capacidade: number;
  pavimento?: 'INF' | 'SUP' | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEspacoEventoDTO {
  nome: string;
  cidade: string;
  capacidade_maxima: number;
  descricao?: string;
  tem_espaco_kids?: boolean;
  tem_pista_led?: boolean;
  tem_centro_better?: boolean;
  tipo_cadeira?: string;
  tipo_decorativo?: string;
  ativo?: boolean;
  ordem?: number;
  cor?: string;
  layouts?: Omit<EspacoEventoLayout, 'id' | 'espaco_id' | 'created_at' | 'updated_at'>[]; // Adicionar layouts
}

export interface UpdateEspacoEventoDTO {
  nome?: string;
  cidade?: string;
  capacidade_maxima?: number;
  descricao?: string;
  tem_espaco_kids?: boolean;
  tem_pista_led?: boolean;
  tem_centro_better?: boolean;
  tipo_cadeira?: string;
  tipo_decorativo?: string;
  ativo?: boolean;
  ordem?: number;
  cor?: string;
  layouts?: Omit<EspacoEventoLayout, 'id' | 'espaco_id' | 'created_at' | 'updated_at'>[]; // Adicionar layouts
}

export interface EspacoEventoFilters {
  nome?: string;
  cidade?: string;
  capacidade_min?: number;
  capacidade_max?: number;
  ativo?: boolean;
  page?: number;
  limit?: number;
}

// Tipos para cupons de desconto
export interface CupomDesconto extends BaseEntity {
  codigo: string;
  nome: string;
  descricao?: string;
  tipo_desconto: 'percentual' | 'valor_fixo';
  valor_desconto: number;
  valor_minimo_pedido?: number;
  data_inicio?: string;
  data_fim?: string;
  limite_uso?: number;
  uso_atual: number;
  cliente_especifico_id?: string;
  dias_semana?: string[] | null;
  nivel_acesso: 'admin' | 'vendedor';
  ativo: boolean;
  created_by: string;
  
  // Relacionamentos
  created_by_user?: {
    id: string;
    nome: string;
    email: string;
  };
  cliente_especifico?: {
    id: string;
    nome: string;
    cpf_cnpj: string;
  };
}

export interface CupomUsoHistorico extends BaseEntity {
  cupom_id: string;
  cliente_id: string;
  contrato_id?: string;
  valor_desconto_aplicado: number;
  data_uso: string;
  usuario_id: string;
  
  // Relacionamentos
  cupom?: CupomDesconto;
  cliente?: Cliente;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
} 