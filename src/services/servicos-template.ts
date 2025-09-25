import { createClient } from '@supabase/supabase-js';
import { ServicoTemplate, ServicoParametro, UpdateServicoTemplateDTO } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Supabase com service role para operações do servidor
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export class ServicoTemplateService {
  // Listar todos os serviços template com seus parâmetros
  static async listar(): Promise<ServicoTemplate[]> {
    const { data: servicos, error } = await supabaseAdmin
      .from('servicos_template')
      .select(`
        *,
        parametros:servicos_parametros(*)
      `)
      .order('ordem', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar serviços template: ${error.message}`);
    }

    return servicos || [];
  }

  // Buscar serviço template por ID
  static async buscarPorId(id: string): Promise<ServicoTemplate | null> {
    const { data: servico, error } = await supabaseAdmin
      .from('servicos_template')
      .select(`
        *,
        parametros:servicos_parametros(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Não encontrado
        return null;
      }
      throw new Error(`Erro ao buscar serviço template: ${error.message}`);
    }

    return servico;
  }

  // Atualizar serviço template
  static async atualizar(id: string, dados: UpdateServicoTemplateDTO): Promise<ServicoTemplate> {
    // Verificar se serviço existe
    const servicoExistente = await this.buscarPorId(id);
    if (!servicoExistente) {
      throw new Error('Serviço template não encontrado');
    }

    // Validações
    if (dados.nome !== undefined && !dados.nome?.trim()) {
      throw new Error('Nome não pode estar vazio');
    }

    // Atualizar dados principais
    const dadosAtualizacao = {
      nome: dados.nome?.trim(),
      descricao: dados.descricao?.trim(),
      ativo: dados.ativo,
      para_reajuste: dados.para_reajuste,
      updated_at: new Date().toISOString()
    };

    // Remover campos undefined
    Object.keys(dadosAtualizacao).forEach(key => {
      if (dadosAtualizacao[key as keyof typeof dadosAtualizacao] === undefined) {
        delete dadosAtualizacao[key as keyof typeof dadosAtualizacao];
      }
    });

    const { data: servicoAtualizado, error } = await supabaseAdmin
      .from('servicos_template')
      .update(dadosAtualizacao)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar serviço template: ${error.message}`);
    }

    // Atualizar parâmetros se fornecidos
    if (dados.parametros) {
      // Remover parâmetros existentes
      const { error: deleteError } = await supabaseAdmin
        .from('servicos_parametros')
        .delete()
        .eq('servico_id', id);

      if (deleteError) {
        throw new Error(`Erro ao remover parâmetros existentes: ${deleteError.message}`);
      }

      // Inserir novos parâmetros
      if (dados.parametros.length > 0) {
        const parametrosParaInserir = dados.parametros.map(param => ({
          servico_id: id,
          chave: param.chave,
          valor: param.valor || '', // Permitir valores vazios
          tipo_dado: param.tipo_dado
        }));

        const { error: insertError } = await supabaseAdmin
          .from('servicos_parametros')
          .insert(parametrosParaInserir);

        if (insertError) {
          throw new Error(`Erro ao inserir novos parâmetros: ${insertError.message}`);
        }
      }
    }

    // Buscar serviço atualizado com parâmetros
    const servicoCompleto = await this.buscarPorId(id);
    if (!servicoCompleto) {
      throw new Error('Erro ao buscar serviço atualizado');
    }

    return servicoCompleto;
  }

  // Ativar/desativar serviço template
  static async alterarStatus(id: string, ativo: boolean): Promise<ServicoTemplate> {
    return this.atualizar(id, { ativo });
  }

  // Obter parâmetros de um serviço específico
  static async obterParametros(servicoId: string): Promise<ServicoParametro[]> {
    const { data: parametros, error } = await supabaseAdmin
      .from('servicos_parametros')
      .select('*')
      .eq('servico_id', servicoId);

    if (error) {
      throw new Error(`Erro ao obter parâmetros: ${error.message}`);
    }

    return parametros || [];
  }

  // Atualizar apenas parâmetros
  static async atualizarParametros(servicoId: string, parametros: { chave: string; valor: string; tipo_dado: 'number' | 'text' | 'boolean' }[]): Promise<void> {
    // Verificar se serviço existe
    const servicoExistente = await this.buscarPorId(servicoId);
    if (!servicoExistente) {
      throw new Error('Serviço template não encontrado');
    }

    // Remover parâmetros existentes
    const { error: deleteError } = await supabaseAdmin
      .from('servicos_parametros')
      .delete()
      .eq('servico_id', servicoId);

    if (deleteError) {
      throw new Error(`Erro ao remover parâmetros existentes: ${deleteError.message}`);
    }

    // Inserir novos parâmetros
    if (parametros.length > 0) {
      const parametrosParaInserir = parametros.map(param => ({
        servico_id: servicoId,
        chave: param.chave,
        valor: param.valor || '', // Permitir valores vazios
        tipo_dado: param.tipo_dado
      }));

      const { error: insertError } = await supabaseAdmin
        .from('servicos_parametros')
        .insert(parametrosParaInserir);

      if (insertError) {
        throw new Error(`Erro ao inserir novos parâmetros: ${insertError.message}`);
      }
    }
  }
}