// Tipos para o módulo de Calendário

export interface Reserva {
  id: string;
  espaco_evento_id: string;
  contrato_id?: string;
  data_inicio: string;
  data_fim: string;
  hora_inicio: string;
  hora_fim: string;
  status: 'confirmado' | 'pendente' | 'cancelado';
  titulo: string;
  descricao?: string;
  cliente_id?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  cliente?: Cliente;
  espaco?: EspacoEvento;
  contrato?: Contrato;
}

export interface Bloqueio {
  id: string;
  espaco_evento_id: string;
  data_inicio: string;
  data_fim: string;
  motivo: string;
  observacoes?: string;
  created_at: string;
  created_by: string;
  espaco?: EspacoEvento;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj?: string;
  telefone?: string;
  email?: string;
}

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
  tipo_toalha?: string | null;
  valor_diaria?: number | null;
  valor_hora?: number | null;
  ativo: boolean;
  endereco?: string | null;
  created_at: string;
  updated_at: string;
  layouts?: Layout[];
}

export interface Layout {
  id: string;
  espaco_evento_id: string;
  layout: string;
  capacidade: number;
  descricao?: string;
}

export interface Contrato {
  id: string;
  numero: string;
  cliente_id: string;
  valor_total: number;
  status: string;
}

export interface FiltrosCalendario {
  espaco_id?: string;
  status?: 'todos' | 'confirmado' | 'pendente' | 'cancelado';
  cliente_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface EventoCalendario {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  tipo: 'reserva' | 'bloqueio';
  dados: Reserva | Bloqueio;
}

export interface DisponibilidadeResponse {
  disponivel: boolean;
  conflitos: {
    reservas: number;
    bloqueios: number;
  };
}

export interface ReservaDefinitivaPayload {
  titulo: string;
  espaco_evento_id: string;
  cliente_id?: string | null;
  data_inicio: string;
  data_fim: string;
  hora_inicio: string;
  hora_fim: string;
  status: 'confirmado' | 'pendente' | 'cancelado';
  descricao?: string | null;
  observacoes?: string | null;
}

export interface ReservaTemporariaPayload {
  espaco_evento_id: string;
  cliente_id?: string | null;
  data_inicio: string;
  data_fim: string;
  hora_inicio: string;
  hora_fim: string;
  descricao?: string | null;
  observacoes?: string | null;
}

export interface CalendarioStats {
  total_reservas: number;
  confirmadas: number;
  pendentes: number;
  canceladas: number;
  dias_bloqueados: number;
}

export interface ReservaTemporaria {
  id: string;
  espaco_evento_id: string;
  usuario_id: string;
  cliente_id?: string;
  data_inicio: string;
  data_fim: string;
  hora_inicio: string;
  hora_fim: string;
  status: 'ativa' | 'expirada' | 'convertida' | 'liberada';
  expira_em: string;
  numero_reserva?: string;
  created_at: string;
  updated_at: string;
  vendedor?: {
    nome: string;
    email: string;
  };
  cliente?: {
    nome: string;
    email: string;
  };
  espaco?: EspacoEvento;
}

export interface FilaEspera {
  id: string;
  espaco_evento_id: string;
  usuario_id: string;
  data_inicio: string;
  data_fim: string;
  hora_inicio: string;
  hora_fim: string;
  posicao: number;
  pontuacao: number;
  status: 'ativo' | 'notificado' | 'removido';
  created_at: string;
  updated_at: string;
  vendedor?: {
    nome: string;
    email: string;
  };
  espaco?: EspacoEvento;
}

export interface HistoricoConversao {
  id: string;
  reserva_temporaria_id: string;
  contrato_id: string;
  usuario_id: string;
  tempo_conversao_horas: number;
  created_at: string;
}

export interface DashboardMetrics {
  reservas_ativas: number;
  reservas_expirando: number;
  propostas_geradas: number;
  taxa_conversao: number;
  tempo_medio_conversao: number;
  posicoes_fila: FilaEspera[];
  historico_conversoes: HistoricoConversao[];
}

export interface PontuacaoVendedor {
  usuario_id: string;
  pontos_base: number;
  bonus_performance: number;
  bonus_experiencia: number;
  total: number;
}

export type ViewMode = 'month' | 'week' | 'day';

export interface CalendarioContextType {
  reservas: Reserva[];
  bloqueios: Bloqueio[];
  reservasTemporarias: ReservaTemporaria[];
  loading: boolean;
  error: string | null;
  filtros: FiltrosCalendario;
  viewMode: ViewMode;
  selectedDate: Date;
  setFiltros: (filtros: FiltrosCalendario) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedDate: (date: Date) => void;
  criarReserva: (reserva: Omit<Reserva, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<void>;
  atualizarReserva: (id: string, reserva: Partial<Reserva>) => Promise<void>;
  excluirReserva: (id: string) => Promise<void>;
  criarBloqueio: (bloqueio: Omit<Bloqueio, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  excluirBloqueio: (id: string) => Promise<void>;
  verificarDisponibilidade: (espaco_id: string, data_inicio: string, data_fim: string) => Promise<DisponibilidadeResponse>;
  refetch: () => void;
}