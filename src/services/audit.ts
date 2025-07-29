import { createClient } from '@supabase/supabase-js';
import { 
  AdminLog, 
  PaginatedResponse,
  LogFilters
} from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Supabase com service role para operações do servidor
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export class AuditService {
  // Listar logs com filtros e paginação
  static async listarLogs(
    filters: LogFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<AdminLog>> {
    let query = supabaseAdmin
      .from('admin_logs')
      .select(`
        *,
        admin:users(nome, email)
      `, { count: 'exact' });

    // Aplicar filtros
    if (filters.admin_id) {
      query = query.eq('admin_id', filters.admin_id);
    }
    if (filters.acao) {
      query = query.eq('acao', filters.acao);
    }
    if (filters.recurso) {
      query = query.eq('recurso', filters.recurso);
    }
    if (filters.data_inicio) {
      query = query.gte('created_at', filters.data_inicio);
    }
    if (filters.data_fim) {
      query = query.lte('created_at', filters.data_fim);
    }

    // Aplicar paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Ordenar por data (mais recente primeiro)
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao listar logs: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  // Buscar log por ID
  static async buscarLogPorId(id: string): Promise<AdminLog | null> {
    const { data, error } = await supabaseAdmin
      .from('admin_logs')
      .select(`
        *,
        admin:users(nome, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar log: ${error.message}`);
    }

    return data;
  }

  // Registrar novo log administrativo
  static async registrarLog(
    adminId: string,
    acao: string,
    recurso: string,
    recursoId?: string,
    detalhes?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AdminLog> {
    const novoLog = {
      admin_id: adminId,
      acao: acao.toUpperCase(),
      recurso: recurso.toLowerCase(),
      recurso_id: recursoId || null,
      detalhes: detalhes || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null
    };

    const { data, error } = await supabaseAdmin
      .from('admin_logs')
      .insert(novoLog)
      .select(`
        *,
        admin:users(nome, email)
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao registrar log: ${error.message}`);
    }

    return data;
  }

  // Obter logs de um usuário específico
  static async obterLogsUsuario(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<AdminLog>> {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('admin_logs')
      .select(`
        *,
        admin:users(nome, email)
      `, { count: 'exact' })
      .eq('admin_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao obter logs do usuário: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  // Obter logs por recurso específico
  static async obterLogsPorRecurso(
    recurso: string,
    recursoId?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<AdminLog>> {
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('admin_logs')
      .select(`
        *,
        admin:users(nome, email)
      `, { count: 'exact' })
      .eq('recurso', recurso);

    if (recursoId) {
      query = query.eq('recurso_id', recursoId);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao obter logs do recurso: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  // Obter ações mais comuns
  static async obterAcoesComuns(limite: number = 10): Promise<{
    acao: string;
    quantidade: number;
    ultimaVez: string;
  }[]> {
    const { data, error } = await supabaseAdmin
      .from('admin_logs')
      .select('acao, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao obter ações comuns: ${error.message}`);
    }

    // Contar ações
    const contadorAcoes: Record<string, { quantidade: number; ultimaVez: string }> = {};
    
    data?.forEach(log => {
      if (!contadorAcoes[log.acao]) {
        contadorAcoes[log.acao] = { quantidade: 0, ultimaVez: log.created_at };
      }
      contadorAcoes[log.acao].quantidade++;
      
      // Manter a data mais recente
      if (new Date(log.created_at) > new Date(contadorAcoes[log.acao].ultimaVez)) {
        contadorAcoes[log.acao].ultimaVez = log.created_at;
      }
    });

    return Object.entries(contadorAcoes)
      .map(([acao, info]) => ({
        acao,
        quantidade: info.quantidade,
        ultimaVez: info.ultimaVez
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, limite);
  }

  // Obter recursos mais afetados
  static async obterRecursosMaisAfetados(limite: number = 10): Promise<{
    recurso: string;
    quantidade: number;
    ultimaAlteracao: string;
  }[]> {
    const { data, error } = await supabaseAdmin
      .from('admin_logs')
      .select('recurso, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao obter recursos afetados: ${error.message}`);
    }

    // Contar recursos
    const contadorRecursos: Record<string, { quantidade: number; ultimaAlteracao: string }> = {};
    
    data?.forEach(log => {
      if (!contadorRecursos[log.recurso]) {
        contadorRecursos[log.recurso] = { quantidade: 0, ultimaAlteracao: log.created_at };
      }
      contadorRecursos[log.recurso].quantidade++;
      
      // Manter a data mais recente
      if (new Date(log.created_at) > new Date(contadorRecursos[log.recurso].ultimaAlteracao)) {
        contadorRecursos[log.recurso].ultimaAlteracao = log.created_at;
      }
    });

    return Object.entries(contadorRecursos)
      .map(([recurso, info]) => ({
        recurso,
        quantidade: info.quantidade,
        ultimaAlteracao: info.ultimaAlteracao
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, limite);
  }

  // Obter atividade por período
  static async obterAtividadePorPeriodo(
    dataInicio: string,
    dataFim: string
  ): Promise<{
    data: string;
    quantidade: number;
  }[]> {
    const { data, error } = await supabaseAdmin
      .from('admin_logs')
      .select('created_at')
      .gte('created_at', dataInicio)
      .lte('created_at', dataFim)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao obter atividade por período: ${error.message}`);
    }

    // Agrupar por data
    const atividadePorDia: Record<string, number> = {};
    
    data?.forEach(log => {
      const data = new Date(log.created_at).toISOString().split('T')[0];
      atividadePorDia[data] = (atividadePorDia[data] || 0) + 1;
    });

    return Object.entries(atividadePorDia)
      .map(([data, quantidade]) => ({ data, quantidade }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }

  // Obter administradores mais ativos
  static async obterAdminsAtivos(limite: number = 5): Promise<{
    admin: {
      id: string;
      nome: string;
      email: string;
    };
    quantidade: number;
    ultimaAtividade: string;
  }[]> {
    const { data, error } = await supabaseAdmin
      .from('admin_logs')
      .select(`
        admin_id,
        created_at,
        admin:users(id, nome, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao obter admins ativos: ${error.message}`);
    }

    // Contar atividades por admin
    const atividadePorAdmin: Record<string, {
      admin: any;
      quantidade: number;
      ultimaAtividade: string;
    }> = {};
    
    data?.forEach(log => {
      if (!log.admin) return;
      
      // O Supabase pode retornar admin como array ou objeto, então vamos normalizar
      const admin = Array.isArray(log.admin) ? log.admin[0] : log.admin;
      if (!admin?.id) return;
      
      const adminId = admin.id;
      if (!atividadePorAdmin[adminId]) {
        atividadePorAdmin[adminId] = {
          admin: admin,
          quantidade: 0,
          ultimaAtividade: log.created_at
        };
      }
      atividadePorAdmin[adminId].quantidade++;
      
      // Manter a data mais recente
      if (new Date(log.created_at) > new Date(atividadePorAdmin[adminId].ultimaAtividade)) {
        atividadePorAdmin[adminId].ultimaAtividade = log.created_at;
      }
    });

    return Object.values(atividadePorAdmin)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, limite);
  }

  // Obter estatísticas gerais de auditoria
  static async obterEstatisticas(): Promise<{
    totalLogs: number;
    logsHoje: number;
    logsSemana: number;
    logsMes: number;
    adminsAtivos: number;
    acaoMaisComum: string | null;
    recursoMaisAfetado: string | null;
  }> {
    // Total de logs
    const { count: totalLogs, error: errorTotal } = await supabaseAdmin
      .from('admin_logs')
      .select('*', { count: 'exact', head: true });

    if (errorTotal) {
      throw new Error(`Erro ao contar logs: ${errorTotal.message}`);
    }

    // Data de hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeString = hoje.toISOString();

    // Logs de hoje
    const { count: logsHoje, error: errorHoje } = await supabaseAdmin
      .from('admin_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', hojeString);

    if (errorHoje) {
      throw new Error(`Erro ao contar logs de hoje: ${errorHoje.message}`);
    }

    // Logs da semana (últimos 7 dias)
    const semanaAtras = new Date();
    semanaAtras.setDate(semanaAtras.getDate() - 7);
    const semanaString = semanaAtras.toISOString();

    const { count: logsSemana, error: errorSemana } = await supabaseAdmin
      .from('admin_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', semanaString);

    if (errorSemana) {
      throw new Error(`Erro ao contar logs da semana: ${errorSemana.message}`);
    }

    // Logs do mês (últimos 30 dias)
    const mesAtras = new Date();
    mesAtras.setDate(mesAtras.getDate() - 30);
    const mesString = mesAtras.toISOString();

    const { count: logsMes, error: errorMes } = await supabaseAdmin
      .from('admin_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', mesString);

    if (errorMes) {
      throw new Error(`Erro ao contar logs do mês: ${errorMes.message}`);
    }

    // Admins únicos que fizeram ações
    const { data: adminsUnicos, error: errorAdmins } = await supabaseAdmin
      .from('admin_logs')
      .select('admin_id')
      .gte('created_at', mesString);

    if (errorAdmins) {
      throw new Error(`Erro ao contar admins ativos: ${errorAdmins.message}`);
    }

    const adminsAtivos = new Set(adminsUnicos?.map(log => log.admin_id)).size;

    // Ação mais comum
    const acoesComuns = await this.obterAcoesComuns(1);
    const acaoMaisComum = acoesComuns[0]?.acao || null;

    // Recurso mais afetado
    const recursos = await this.obterRecursosMaisAfetados(1);
    const recursoMaisAfetado = recursos[0]?.recurso || null;

    return {
      totalLogs: totalLogs || 0,
      logsHoje: logsHoje || 0,
      logsSemana: logsSemana || 0,
      logsMes: logsMes || 0,
      adminsAtivos,
      acaoMaisComum,
      recursoMaisAfetado
    };
  }

  // Exportar logs (formato JSON)
  static async exportarLogs(
    filters: LogFilters = {},
    formato: 'json' | 'csv' = 'json'
  ): Promise<any> {
    let query = supabaseAdmin
      .from('admin_logs')
      .select(`
        *,
        admin:users(nome, email)
      `);

    // Aplicar filtros
    if (filters.admin_id) {
      query = query.eq('admin_id', filters.admin_id);
    }
    if (filters.acao) {
      query = query.eq('acao', filters.acao);
    }
    if (filters.recurso) {
      query = query.eq('recurso', filters.recurso);
    }
    if (filters.data_inicio) {
      query = query.gte('created_at', filters.data_inicio);
    }
    if (filters.data_fim) {
      query = query.lte('created_at', filters.data_fim);
    }

    // Ordenar por data
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao exportar logs: ${error.message}`);
    }

    if (formato === 'csv') {
      // Converter para CSV (implementação básica)
      if (!data || data.length === 0) return '';
      
      const headers = ['Data', 'Admin', 'Ação', 'Recurso', 'Detalhes'];
      const rows = data.map(log => [
        new Date(log.created_at).toLocaleString('pt-BR'),
        log.admin?.nome || 'N/A',
        log.acao,
        log.recurso,
        JSON.stringify(log.detalhes || {})
      ]);
      
      return [headers, ...rows].map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
    }

    return data;
  }

  // Limpar logs antigos (manter apenas logs dos últimos X dias)
  static async limparLogsAntigos(diasParaManter: number = 365): Promise<number> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasParaManter);
    const dataLimiteString = dataLimite.toISOString();

    // Contar quantos logs serão removidos
    const { count, error: errorCount } = await supabaseAdmin
      .from('admin_logs')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', dataLimiteString);

    if (errorCount) {
      throw new Error(`Erro ao contar logs antigos: ${errorCount.message}`);
    }

    // Remover logs antigos
    const { error } = await supabaseAdmin
      .from('admin_logs')
      .delete()
      .lt('created_at', dataLimiteString);

    if (error) {
      throw new Error(`Erro ao limpar logs antigos: ${error.message}`);
    }

    return count || 0;
  }
} 