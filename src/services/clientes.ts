import { Cliente, CreateClienteDTO, UpdateClienteDTO, ClienteFilters, PaginatedResponse } from '@/types/database';
import { validateCPFCNPJ } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

// Usar a função centralizada para criar o cliente admin
const getSupabaseAdmin = () => createSupabaseAdminClient();

export class ClienteService {
  // Listar clientes com filtros e paginação
  static async listar(
    filters: ClienteFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Cliente>> {
    const supabaseAdmin = getSupabaseAdmin();
    
    let query = supabaseAdmin
      .from('clientes')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters.codigo) {
      // Busca específica por código
      query = query.ilike('codigo', `%${filters.codigo}%`);
    } else if (filters.nome) {
      // Busca em nome, incluindo busca por CPF/CNPJ se o termo parece ser um documento
      const cleanTerm = filters.nome.replace(/\D/g, '');
      if (cleanTerm.length >= 11 && (cleanTerm.length === 11 || cleanTerm.length === 14)) {
        // Se parece ser CPF/CNPJ, buscar também no campo cpf_cnpj
        query = query.or(`nome.ilike.%${filters.nome}%,cpf_cnpj.ilike.%${cleanTerm}%`);
      } else {
        query = query.ilike('nome', `%${filters.nome}%`);
      }
    }
    
    if (filters.cpf_cnpj) {
      // Limpar formatação do CPF/CNPJ para busca mais flexível
      const cleanCpfCnpj = filters.cpf_cnpj.replace(/\D/g, '');
      query = query.ilike('cpf_cnpj', `%${cleanCpfCnpj}%`);
    }
    
    if (filters.email) {
      query = query.ilike('email', `%${filters.email}%`);
    }
    if (filters.cidade) {
      query = query.ilike('cidade', `%${filters.cidade}%`);
    }
    if (filters.ativo !== undefined) {
      query = query.eq('ativo', filters.ativo);
    }

    // Filtro por tipo de pessoa baseado no tamanho do CPF/CNPJ
    if (filters.tipo_pessoa) {
      if (filters.tipo_pessoa === 'pessoa_fisica') {
        // CPF tem exatamente 11 dígitos
        query = query.like('cpf_cnpj', '___________');
      } else if (filters.tipo_pessoa === 'empresa') {
        // CNPJ tem exatamente 14 dígitos
        query = query.like('cpf_cnpj', '______________');
      }
    }

    // Aplicar paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Ordenar por nome
    query = query.order('nome', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao listar clientes: ${error.message}`);
    }

    // Filtrar e validar dados para garantir que não há registros inválidos
    const dadosValidados = (data || []).filter(cliente => {
      return cliente && 
             cliente.id && 
             cliente.nome && 
             cliente.cpf_cnpj &&
             typeof cliente.ativo === 'boolean';
    });

    return {
      data: dadosValidados,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  // Buscar cliente por ID
  static async buscarPorId(id: string): Promise<Cliente | null> {
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar cliente: ${error.message}`);
    }

    return data;
  }

  // Buscar cliente por CPF/CNPJ (busca exata sem formatação)
  static async buscarPorCpfCnpj(cpfCnpj: string): Promise<Cliente | null> {
    const supabaseAdmin = getSupabaseAdmin();
    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
    
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('*')
      .eq('cpf_cnpj', cleanCpfCnpj)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar cliente por CPF/CNPJ: ${error.message}`);
    }

    return data;
  }

  // Buscar clientes por CPF/CNPJ (busca flexível para encontrar múltiplos)
  static async buscarPorCpfCnpjFlexivel(cpfCnpj: string): Promise<Cliente[]> {
    const supabaseAdmin = getSupabaseAdmin();
    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
    
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('*')
      .ilike('cpf_cnpj', `%${cleanCpfCnpj}%`)
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(10);

    if (error) {
      throw new Error(`Erro ao buscar clientes por CPF/CNPJ: ${error.message}`);
    }

    return data || [];
  }

  // Criar novo cliente
  static async criar(dadosCliente: CreateClienteDTO): Promise<Cliente> {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Validações
    if (!dadosCliente.nome?.trim()) {
      throw new Error('Nome é obrigatório');
    }

    if (!dadosCliente.cpf_cnpj?.trim()) {
      throw new Error('CPF/CNPJ é obrigatório');
    }

    // Limpar e validar CPF/CNPJ
    const cpfCnpjLimpo = dadosCliente.cpf_cnpj.replace(/\D/g, '');
    if (!validateCPFCNPJ(cpfCnpjLimpo)) {
      throw new Error('CPF/CNPJ inválido');
    }

    // Verificar se CPF/CNPJ já existe
    const clienteExistente = await this.buscarPorCpfCnpj(cpfCnpjLimpo);
    if (clienteExistente) {
      throw new Error('CPF/CNPJ já cadastrado');
    }

    // Validar email se fornecido
    if (dadosCliente.email && !this.validarEmail(dadosCliente.email)) {
      throw new Error('Email inválido');
    }

    const novoCliente = {
      ...dadosCliente,
      cpf_cnpj: cpfCnpjLimpo,
      nome: dadosCliente.nome.trim(),
      email: dadosCliente.email?.trim().toLowerCase() || null,
      ativo: dadosCliente.ativo ?? true
    };

    const { data, error } = await supabaseAdmin
      .from('clientes')
      .insert(novoCliente)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar cliente: ${error.message}`);
    }

    return data;
  }

  // Atualizar cliente
  static async atualizar(id: string, dadosCliente: UpdateClienteDTO): Promise<Cliente> {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Verificar se cliente existe
    const clienteExistente = await this.buscarPorId(id);
    if (!clienteExistente) {
      throw new Error('Cliente não encontrado');
    }

    // Validações dos campos que estão sendo atualizados
    if (dadosCliente.nome !== undefined && !dadosCliente.nome?.trim()) {
      throw new Error('Nome não pode estar vazio');
    }

    if (dadosCliente.cpf_cnpj !== undefined) {
      if (!dadosCliente.cpf_cnpj?.trim()) {
        throw new Error('CPF/CNPJ é obrigatório');
      }

      const cpfCnpjLimpo = dadosCliente.cpf_cnpj.replace(/\D/g, '');
      if (!validateCPFCNPJ(cpfCnpjLimpo)) {
        throw new Error('CPF/CNPJ inválido');
      }

      // Verificar se CPF/CNPJ já existe em outro cliente
      const outroCliente = await this.buscarPorCpfCnpj(cpfCnpjLimpo);
      if (outroCliente && outroCliente.id !== id) {
        throw new Error('CPF/CNPJ já cadastrado para outro cliente');
      }

      dadosCliente.cpf_cnpj = cpfCnpjLimpo;
    }

    if (dadosCliente.email !== undefined && dadosCliente.email && !this.validarEmail(dadosCliente.email)) {
      throw new Error('Email inválido');
    }

    // Preparar dados para atualização
    const dadosAtualizacao = { ...dadosCliente };
    if (dadosAtualizacao.nome) {
      dadosAtualizacao.nome = dadosAtualizacao.nome.trim();
    }
    if (dadosAtualizacao.email) {
      dadosAtualizacao.email = dadosAtualizacao.email.trim().toLowerCase();
    }

    const { data, error } = await supabaseAdmin
      .from('clientes')
      .update(dadosAtualizacao)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar cliente: ${error.message}`);
    }

    return data;
  }

  // Desativar cliente (soft delete)
  static async desativar(id: string): Promise<Cliente> {
    return this.atualizar(id, { ativo: false });
  }

  // Ativar cliente
  static async ativar(id: string): Promise<Cliente> {
    return this.atualizar(id, { ativo: true });
  }

  // Excluir cliente (hard delete)
  static async excluir(id: string): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Verificar se cliente existe
    const cliente = await this.buscarPorId(id);
    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    // Verificar se cliente tem contratos
    const { data: contratos, error: errorContratos } = await supabaseAdmin
      .from('contratos')
      .select('id')
      .eq('cliente_id', id)
      .limit(1);

    if (errorContratos) {
      throw new Error(`Erro ao verificar contratos: ${errorContratos.message}`);
    }

    if (contratos && contratos.length > 0) {
      throw new Error('Não é possível excluir cliente que possui contratos. Desative o cliente ao invés de excluir.');
    }

    const { error } = await supabaseAdmin
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir cliente: ${error.message}`);
    }
  }

  // Buscar clientes para select/autocomplete
  static async buscarParaSelect(termo: string = '', limite: number = 10): Promise<Pick<Cliente, 'id' | 'nome' | 'cpf_cnpj'>[]> {
    const supabaseAdmin = getSupabaseAdmin();
    
    let query = supabaseAdmin
      .from('clientes')
      .select('id, nome, cpf_cnpj')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(limite);

    if (termo.trim()) {
      // Verificar se é busca por código (começa com 'C')
      if (termo.toUpperCase().startsWith('C')) {
        // Busca específica por código
        query = query.ilike('codigo', `%${termo.toUpperCase()}%`);
      } else {
        // Melhorar busca: limpar formatação se parece ser CPF/CNPJ
        const cleanTerm = termo.replace(/\D/g, '');
        if (cleanTerm.length >= 8) {
          // Se tem 8+ dígitos, buscar também no CPF/CNPJ sem formatação
          query = query.or(`nome.ilike.%${termo}%,cpf_cnpj.ilike.%${cleanTerm}%`);
        } else {
          // Busca normal por nome
          query = query.ilike('nome', `%${termo}%`);
        }
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar clientes: ${error.message}`);
    }

    return data || [];
  }

  // Buscar endereço por CEP (ViaCEP)
  static async buscarCep(cep: string): Promise<any> {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      throw new Error('CEP deve ter 8 dígitos');
    }
    
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();

    if (data.erro) {
      throw new Error('CEP não encontrado');
    }
    
    return data;
  }

  // Buscar dados de empresa por CNPJ (CNPJá)
  static async buscarCnpj(cnpj: string): Promise<any> {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ deve ter 14 dígitos');
    }
    
    // Usando a API CNPJá gratuita - pode ter limites de uso
    const response = await fetch(`https://open.cnpja.com/office/${cnpjLimpo}`);
    
    if (!response.ok) {
      // A API pode retornar 429 (Too Many Requests) ou outros erros
      throw new Error(`Erro na API de CNPJ: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  // Validar email (método privado)
  private static validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Obter estatísticas de clientes
  static async obterEstatisticas(): Promise<{
    total: number;
    ativos: number;
    inativos: number;
    pessoas_fisicas: number;
    empresas: number;
    comContratos: number;
  }> {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Total de clientes
    const { count: total, error: errorTotal } = await supabaseAdmin
      .from('clientes')
      .select('*', { count: 'exact', head: true });

    if (errorTotal) {
      throw new Error(`Erro ao contar clientes: ${errorTotal.message}`);
    }

    // Clientes ativos
    const { count: ativos, error: errorAtivos } = await supabaseAdmin
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    if (errorAtivos) {
      throw new Error(`Erro ao contar clientes ativos: ${errorAtivos.message}`);
    }

    // Buscar todos os CPF/CNPJ para classificar
    const { data: clientesDocs, error: errorDocs } = await supabaseAdmin
      .from('clientes')
      .select('cpf_cnpj')
      .eq('ativo', true);

    if (errorDocs) {
      throw new Error(`Erro ao buscar documentos: ${errorDocs.message}`);
    }

    // Classificar por tipo de documento
    let pessoas_fisicas = 0;
    let empresas = 0;

    clientesDocs?.forEach(cliente => {
      const doc = cliente.cpf_cnpj.replace(/\D/g, '');
      if (doc.length === 11) {
        pessoas_fisicas++;
      } else if (doc.length === 14) {
        empresas++;
      }
    });

    // Clientes com contratos
    const { data: clientesComContratos, error: errorContratos } = await supabaseAdmin
      .from('contratos')
      .select('cliente_id')
      .not('cliente_id', 'is', null);

    if (errorContratos) {
      throw new Error(`Erro ao contar clientes com contratos: ${errorContratos.message}`);
    }

    const clientesUnicos = new Set(clientesComContratos?.map(c => c.cliente_id) || []);

    return {
      total: total || 0,
      ativos: ativos || 0,
      inativos: (total || 0) - (ativos || 0),
      pessoas_fisicas,
      empresas,
      comContratos: clientesUnicos.size
    };
  }
} 