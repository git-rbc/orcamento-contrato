import { ContratoVariables } from '@/types/contrato';

interface LinhaItem {
  id?: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  descontoAplicado?: number;
  cupomAplicado?: {
    tipo_desconto: 'percentual' | 'fixo';
    valor_desconto: number;
  };
}

interface PropostaData {
  id: string;
  cliente_id: string;
  tipo_evento?: string;
  data_realizacao: string;
  local_evento?: string;
  num_pessoas: number;
  itens_alimentacao: LinhaItem[];
  itens_bebidas: LinhaItem[];
  itens_servicos: LinhaItem[];
  itens_extras: LinhaItem[];
  rolha_vinho: string;
  rolha_destilado: string;
  rolha_energetico: string;
  rolha_chopp: string;
  total_proposta: number;
  valor_desconto?: number;
  valor_entrada?: number;
  espaco?: {
    nome: string;
  };
}

interface ClienteData {
  id: string;
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  email: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  tipo_pessoa: 'fisica' | 'juridica';
}

/**
 * Gera texto formatado dos serviços baseado nos itens da proposta
 */
export function gerarTextoServicos(proposta: PropostaData): string {
  const servicos: string[] = [];
  
  // Adicionar categorias com itens
  if (proposta.itens_alimentacao?.length > 0) {
    servicos.push('Alimentação');
  }
  
  if (proposta.itens_bebidas?.length > 0) {
    servicos.push('Bebidas');
  }
  
  if (proposta.itens_servicos?.length > 0) {
    servicos.push('Serviços');
  }
  
  if (proposta.itens_extras?.length > 0) {
    servicos.push('Itens Extras');
  }
  
  // Adicionar informações de rolha se não for isenta
  const rolhas: string[] = [];
  if (proposta.rolha_vinho && proposta.rolha_vinho !== 'ISENTA') {
    rolhas.push('Rolha Vinho');
  }
  if (proposta.rolha_destilado && proposta.rolha_destilado !== 'ISENTA') {
    rolhas.push('Rolha Destilado');
  }
  if (proposta.rolha_energetico && proposta.rolha_energetico !== 'ISENTA') {
    rolhas.push('Rolha Energético');
  }
  if (proposta.rolha_chopp && proposta.rolha_chopp !== 'ISENTA') {
    rolhas.push('Rolha Chopp');
  }
  
  if (rolhas.length > 0) {
    servicos.push(...rolhas);
  }
  
  return servicos.length > 0 ? servicos.join(' - ') : 'Locação - Alimentação - Bebidas';
}

/**
 * Calcula valor total de um item com descontos aplicados
 */
function calcularValorItemComDesconto(item: LinhaItem): number {
  const valorBruto = item.valorUnitario * item.quantidade;
  const descontoNormal = valorBruto * (item.descontoAplicado || 0) / 100;
  let descontoCupom = 0;
  
  if (item.cupomAplicado) {
    if (item.cupomAplicado.tipo_desconto === 'percentual') {
      descontoCupom = (valorBruto - descontoNormal) * (item.cupomAplicado.valor_desconto / 100);
    } else {
      descontoCupom = Math.min(item.cupomAplicado.valor_desconto, valorBruto - descontoNormal);
    }
  }
  
  return valorBruto - descontoNormal - descontoCupom;
}

/**
 * Gera resumo HTML detalhado da proposta para anexar ao contrato
 */
export function gerarResumoPropostaHtml(proposta: PropostaData): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderizarItensCategoria = (itens: LinhaItem[], categoria: string): string => {
    const itensValidos = itens.filter(item => item.valorUnitario > 0 && item.quantidade > 0);
    
    if (itensValidos.length === 0) return '';

    const subtotal = itensValidos.reduce((acc, item) => acc + calcularValorItemComDesconto(item), 0);

    let html = `
      <div style="margin-bottom: 1.5rem;">
        <div style="background-color: #fef3c7; padding: 0.75rem; border-bottom: 1px solid #d1d5db; margin-bottom: 0.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-weight: 600; font-size: 1.125rem; margin: 0; color: #000;">${categoria}</h4>
            <div style="display: flex; gap: 2rem;">
              <span style="font-weight: 500; font-size: 0.875rem; color: #000;">Valor Unitário</span>
              <span style="font-weight: 500; font-size: 0.875rem; color: #000;">Valor Total</span>
            </div>
          </div>
        </div>
    `;

    itensValidos.forEach(item => {
      const valorFinal = calcularValorItemComDesconto(item);
      html += `
        <div style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem;">
          <div style="flex: 1;">
            <div style="font-weight: 500; color: #000;">${item.descricao}</div>
            <div style="color: #6b7280; font-size: 0.75rem;">
              Qtd: ${item.quantidade} x ${formatCurrency(item.valorUnitario)}
            </div>
            ${(item.descontoAplicado || 0) > 0 ? `
              <div style="color: #6b7280; font-size: 0.75rem;">
                Desconto: ${item.descontoAplicado}%
              </div>
            ` : ''}
            ${item.cupomAplicado ? `
              <div style="color: #059669; font-size: 0.75rem;">
                Cupom: ${item.cupomAplicado.tipo_desconto === 'percentual' 
                  ? item.cupomAplicado.valor_desconto + '%' 
                  : formatCurrency(item.cupomAplicado.valor_desconto)}
              </div>
            ` : ''}
          </div>
          <div style="display: flex; gap: 2rem; align-items: center;">
            <span style="color: #000;">${formatCurrency(item.valorUnitario)}</span>
            <span style="font-weight: 600; color: #000;">${formatCurrency(valorFinal)}</span>
          </div>
        </div>
      `;
    });

    html += `
        <div style="padding: 0.75rem; background-color: #f9fafb; font-weight: 600; display: flex; justify-content: space-between;">
          <span style="color: #000;">Subtotal ${categoria}:</span>
          <span style="color: #000;">${formatCurrency(subtotal)}</span>
        </div>
      </div>
    `;

    return html;
  };

  let resumoHtml = `
    <div style="margin-top: 3rem; padding-top: 2rem; border-top: 2px solid #d1d5db;">
      <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; text-align: center; color: #000;">
        RESUMO DETALHADO DA PROPOSTA
      </h3>
      <p style="text-align: center; margin-bottom: 2rem; color: #6b7280; font-size: 0.875rem;">
        Detalhamento dos itens e serviços contratados conforme proposta original
      </p>
  `;

  // Adicionar seções de itens
  resumoHtml += renderizarItensCategoria(proposta.itens_alimentacao, 'Alimentação');
  resumoHtml += renderizarItensCategoria(proposta.itens_bebidas, 'Bebidas');
  resumoHtml += renderizarItensCategoria(proposta.itens_servicos, 'Serviços');
  resumoHtml += renderizarItensCategoria(proposta.itens_extras, 'Itens Extras');

  // Adicionar seção de rolhas se houver
  const hasRolhas = [proposta.rolha_vinho, proposta.rolha_destilado, proposta.rolha_energetico, proposta.rolha_chopp]
    .some(rolha => rolha && rolha !== 'ISENTA');

  if (hasRolhas) {
    resumoHtml += `
      <div style="margin-bottom: 1.5rem;">
        <h4 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 1rem; color: #000;">Taxas de Rolha</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div style="text-align: center; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.5rem;">
            <p style="font-weight: 500; margin: 0; color: #000;">Vinho</p>
            <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">${proposta.rolha_vinho || 'ISENTA'}</p>
          </div>
          <div style="text-align: center; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.5rem;">
            <p style="font-weight: 500; margin: 0; color: #000;">Destilado</p>
            <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">${proposta.rolha_destilado || 'ISENTA'}</p>
          </div>
          <div style="text-align: center; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.5rem;">
            <p style="font-weight: 500; margin: 0; color: #000;">Energético</p>
            <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">${proposta.rolha_energetico || 'ISENTA'}</p>
          </div>
          <div style="text-align: center; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.5rem;">
            <p style="font-weight: 500; margin: 0; color: #000;">Chopp</p>
            <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">${proposta.rolha_chopp || 'ISENTA'}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Totalizadores
  const totalCalculado = [
    ...proposta.itens_alimentacao,
    ...proposta.itens_bebidas,
    ...proposta.itens_servicos,
    ...proposta.itens_extras
  ].reduce((acc, item) => acc + calcularValorItemComDesconto(item), 0);

  resumoHtml += `
    <div style="border-top: 1px solid #d1d5db; margin-top: 1.5rem; padding-top: 1rem;">
      <div style="background-color: #f9fafb; padding: 1rem; border-radius: 0.5rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <span style="color: #000;">Subtotal dos Itens:</span>
          <span style="color: #000;">${formatCurrency(totalCalculado)}</span>
        </div>
        ${proposta.valor_desconto && proposta.valor_desconto > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: #dc2626;">
            <span>Desconto Adicional:</span>
            <span>-${formatCurrency(proposta.valor_desconto)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.125rem; padding-top: 0.5rem; border-top: 1px solid #d1d5db; color: #000;">
          <span>VALOR TOTAL:</span>
          <span>${formatCurrency(proposta.total_proposta)}</span>
        </div>
        ${proposta.valor_entrada && proposta.valor_entrada > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; color: #059669;">
            <span>Valor de Entrada:</span>
            <span>${formatCurrency(proposta.valor_entrada)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #6b7280;">
            <span>Saldo a Financiar:</span>
            <span>${formatCurrency(proposta.total_proposta - proposta.valor_entrada)}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  resumoHtml += `</div>`;

  return resumoHtml;
}

/**
 * Cria variáveis do contrato baseado nos dados da proposta e cliente
 */
export function criarVariaveisContratoFromProposta(
  proposta: PropostaData,
  cliente: ClienteData,
  vendedor: string = '',
  numeroContrato: string = ''
): ContratoVariables {
  const formatarData = (date: Date | string): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pt-BR');
  };

  return {
    // Dados do cliente
    CLIENTE_NOME: cliente.nome || '',
    CLIENTE_CPF_CNPJ: cliente.cpf_cnpj || '',
    CLIENTE_TELEFONE: cliente.telefone || '',
    CLIENTE_EMAIL: cliente.email || '',
    CLIENTE_ENDERECO: cliente.endereco || '',
    CLIENTE_NUMERO: cliente.numero || '',
    CLIENTE_BAIRRO: cliente.bairro || '',
    CLIENTE_CIDADE: cliente.cidade || '',
    CLIENTE_CEP: cliente.cep || '',
    
    // Dados do evento
    TIPO_EVENTO: proposta.tipo_evento || 'Evento',
    DATA_EVENTO: formatarData(proposta.data_realizacao),
    LOCAL_EVENTO: proposta.espaco?.nome || proposta.local_evento || '',
    NUM_CONVIDADOS: proposta.num_pessoas?.toString() || '',
    ESPACO: proposta.espaco?.nome || proposta.local_evento || '',
    SERVICOS: gerarTextoServicos(proposta),
    
    // Dados do contrato
    NUM_CONTRATO: numeroContrato,
    DATA_CONTRATACAO: formatarData(new Date()),
    VENDEDOR: vendedor,
    COD_REUNIAO: '', // Pode ser extraído da proposta se disponível
    
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

/**
 * Preenche template completo com dados da proposta
 */
export function preencherTemplateComProposta(
  templateConteudo: string,
  proposta: PropostaData,
  cliente: ClienteData,
  vendedor: string = '',
  numeroContrato: string = ''
): string {
  // Criar variáveis do contrato
  const variaveis = criarVariaveisContratoFromProposta(proposta, cliente, vendedor, numeroContrato);
  
  // Aplicar substituições
  let conteudo = templateConteudo;
  Object.entries(variaveis).forEach(([chave, valor]) => {
    const placeholder = `{{${chave}}}`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    conteudo = conteudo.replace(regex, valor || '');
  });
  
  // Anexar resumo da proposta ao final
  const resumoHtml = gerarResumoPropostaHtml(proposta);
  conteudo += '\n\n' + resumoHtml;
  
  return conteudo;
}