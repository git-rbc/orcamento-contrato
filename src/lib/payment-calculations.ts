export interface PagamentoIndaiaCalculation {
  valorTotal: number;
  valorTotalComJuros: number;
  valorEntrada: number;
  valorParcelas: number;
  quantidadeParcelas: number;
  valorSaldoFinal: number;
  jurosAplicados: number;
  percentualJuros: number;
}

export interface PagamentoSemJuros1mais4Calculation {
  valorTotal: number;
  valorEntrada: number;
  valorParcelas: number;
  quantidadeParcelas: number;
  temSaldoFinal: boolean;
}

export interface PagamentoAVistaDinheiroCalculation {
  valorTotal: number;
  valorTotalComDesconto: number;
  valorEntrada: number;
  valorSaldoFinal: number;
  percentualDesconto: number;
  descontoAplicado: number;
}

export interface PagamentoAVistaParcialCartaoCalculation {
  valorTotal: number;
  valorEntrada: number;
  valorRestante: number;
  valorParcelaCartao: number;
  quantidadeParcelasCartao: number;
  valorTotalComJuros: number;
  jurosAplicados: number;
  percentualJuros: number;
}

export interface PagamentoAVistaParcialCartaoParams {
  valorTotal: number;
  quantidadeParcelas: number;
  taxaJuros?: number;
}

export interface CondicaoEspecialConsultorCalculation {
  valorTotal: number;
  valorEntrada: number;
  parcelasEntrada: number;
  valorParcelaEntrada: number;
  parcelasIntermediarias: number;
  valorParcelaIntermediaria: number;
  valorSaldoFinal: number;
  parcelasSaldoFinal: number;
  valorParcelaSaldoFinal: number;
  valorTotalComJuros: number;
  jurosAplicados: number;
  percentualJuros: number;
  temSaldoFinal: boolean;
}

export interface Pagamento5050Calculation {
  valorTotal: number;
  valorEntrada: number; // 20%
  valorPrimeiroBoleto: number; // 30%
  valorSaldoFinal: number; // 50%
  valorTotalComJuros: number;
  jurosAplicados: number;
  percentualJuros: number;
  dataPrimeiroBoleto: Date; // 30 dias após fechamento
  dataSaldoFinal: Date; // 30 dias antes do evento
}

export interface Pagamento5050Params {
  valorTotal: number;
  dataContrato: Date;
  dataEvento: Date;
  taxaJuros?: number; // Padrão 1,29% ao mês
}

export interface CondicaoEspecialConsultorParams {
  valorTotal: number;
  valorEntrada: number;
  parcelasEntrada: number;
  parcelasIntermediarias: number;
  parcelasSaldoFinal?: number;
  taxaJuros?: number;
  dataEvento: Date;
}

export interface PagamentoIndaiaParams {
  valorTotal: number;
  dataEvento: Date;
  dataAtual?: Date;
}

const PERCENTUAL_ENTRADA = 0.20; // 20%
const PERCENTUAL_SALDO_FINAL = 0.30; // 30%
const TAXA_JUROS_MENSAL = 0.0129; // 1,29% ao mês

// Constantes para modelo Sem Juros (1+4)
const PERCENTUAL_ENTRADA_SEM_JUROS = 0.20; // 20%
const PERCENTUAL_PARCELA_SEM_JUROS = 0.20; // 20% para cada uma das 4 parcelas
const QUANTIDADE_PARCELAS_SEM_JUROS = 4;

// Constantes para modelo À vista (Dinheiro) - 5% desconto
const PERCENTUAL_DESCONTO_A_VISTA_DINHEIRO = 0.05; // 5%
const PERCENTUAL_ENTRADA_A_VISTA_DINHEIRO = 0.20; // 20%
// Constantes para modelo À vista parcial (Cartão de crédito)
const PERCENTUAL_ENTRADA_A_VISTA_PARCIAL_CARTAO = 0.20; // 20%
const TAXA_JUROS_CARTAO_PADRAO = 0.0129; // 1,29% ao mês padrão
const MAX_PARCELAS_CARTAO = 18; // Máximo 18 parcelas
// Constantes para modelo Condição Especial do Consultor
const VALOR_MINIMO_ENTRADA_CONSULTOR = 1000; // R$ 1.000,00
const VALOR_MINIMO_PARCELA_CONSULTOR = 600; // R$ 600,00
const MAX_PARCELAS_ENTRADA_SEM_JUROS = 12; // 12x sem juros na entrada
const MAX_PARCELAS_SALDO_FINAL_CONSULTOR = 18; // Até 18x no saldo final
const TAXA_JUROS_CONSULTOR_PADRAO = 0.0129; // 1,29% ao mês padrão
const MIN_PARCELAS_PARA_CONSULTOR = 5; // Mínimo de 5 parcelas para usar este modelo

const MAX_MESES_PAGAMENTO_INDIA = 600; // ~50 anos - permite cálculo dinâmico baseado em meses reais
const MAX_COMPOUND_PERIODS = 600; // ~50 anos em meses, apenas para evitar overflow
const MAX_COMPOUND_RATE = 1; // 100% ao mês para impedir bases negativas ou infinitas
const MIN_COMPOUND_RATE = -0.99; // evita base zero ou negativa no log
const MAX_CURRENCY_VALUE = Number.MAX_SAFE_INTEGER / 100; // limite seguro para arredondamento

const clampNumber = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const roundCurrency = (value: number): number => {
  const safeValue = clampNumber(value, -MAX_CURRENCY_VALUE, MAX_CURRENCY_VALUE);
  const rounded = Math.round(safeValue * 100) / 100;
  return Number.isFinite(rounded) ? rounded : 0;
};

export function calcularMesesAteEvento(dataEvento: Date, dataAtual: Date = new Date()): number {
  const anoEvento = dataEvento.getFullYear();
  const mesEvento = dataEvento.getMonth();
  const anoAtual = dataAtual.getFullYear();
  const mesAtual = dataAtual.getMonth();

  const mesesRestantes = (anoEvento - anoAtual) * 12 + (mesEvento - mesAtual);

  // Retorna pelo menos 1 mês, máximo 30 meses para evitar cálculos irreais
  if (!Number.isFinite(mesesRestantes)) {
    return 1;
  }

  return Math.max(1, Math.min(MAX_MESES_PAGAMENTO_INDIA, mesesRestantes - 1)); // -1 para considerar 30 dias antes
}

export function calcularJurosCompostos(valorPrincipal: number, taxa: number, periodos: number): number {
  if (!Number.isFinite(valorPrincipal)) {
    throw new Error('Valor principal inválido para cálculo de juros compostos');
  }

  const taxaNormalizada = clampNumber(taxa, MIN_COMPOUND_RATE, MAX_COMPOUND_RATE);
  const periodosNormalizados = clampNumber(periodos, -MAX_COMPOUND_PERIODS, MAX_COMPOUND_PERIODS);
  const base = Math.max(1 + taxaNormalizada, 1e-6);

  const logResultado = periodosNormalizados * Math.log(base);
  const limiteLog = Math.log(Number.MAX_SAFE_INTEGER / Math.max(1, Math.abs(valorPrincipal)));
  const logLimitado = clampNumber(logResultado, -limiteLog, limiteLog);

  const fator = Math.exp(logLimitado);
  const resultado = valorPrincipal * fator;

  if (!Number.isFinite(resultado)) {
    throw new Error('Resultado inválido ao calcular juros compostos');
  }

  return resultado;
}

export function calcularPagamentoIndaia(params: PagamentoIndaiaParams): PagamentoIndaiaCalculation {
  const { valorTotal, dataEvento, dataAtual = new Date() } = params;

  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    throw new Error('Valor total deve ser maior que zero');
  }

  const mesesParaPagamento = calcularMesesAteEvento(dataEvento, dataAtual);
  const parcelasPlanejadas = Math.max(1, Math.trunc(clampNumber(mesesParaPagamento, 1, MAX_MESES_PAGAMENTO_INDIA)));

  // Calcular valor total com juros compostos
  const valorTotalComJuros = calcularJurosCompostos(valorTotal, TAXA_JUROS_MENSAL, parcelasPlanejadas);

  // Calcular valores base
  const valorEntrada = valorTotalComJuros * PERCENTUAL_ENTRADA;
  const valorSaldoFinal = valorTotalComJuros * PERCENTUAL_SALDO_FINAL;

  // Valor restante para as parcelas (50% do total com juros)
  const valorRestanteParaParcelas = Math.max(0, valorTotalComJuros - valorEntrada - valorSaldoFinal);

  // Definir quantidade de parcelas (mínimo 1, máximo baseado nos meses até 30 dias antes do evento)
  const quantidadeParcelas = parcelasPlanejadas;

  // Calcular valor de cada parcela
  const valorParcelas = quantidadeParcelas > 0 ? valorRestanteParaParcelas / quantidadeParcelas : 0;

  return {
    valorTotal,
    valorTotalComJuros: roundCurrency(valorTotalComJuros),
    valorEntrada: roundCurrency(Math.max(0, valorEntrada)),
    valorParcelas: roundCurrency(Math.max(0, valorParcelas)),
    quantidadeParcelas,
    valorSaldoFinal: roundCurrency(Math.max(0, valorSaldoFinal)),
    jurosAplicados: roundCurrency(Math.max(0, valorTotalComJuros - valorTotal)),
    percentualJuros: TAXA_JUROS_MENSAL * 100
  };
}

export function calcularPagamentoSemJuros1mais4(valorTotal: number): PagamentoSemJuros1mais4Calculation {
  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    throw new Error('Valor total deve ser maior que zero');
  }

  // Calcular valores - sem juros, valores baseados no total original
  const valorEntrada = valorTotal * PERCENTUAL_ENTRADA_SEM_JUROS;
  const valorParcelas = valorTotal * PERCENTUAL_PARCELA_SEM_JUROS;

  return {
    valorTotal,
    valorEntrada: roundCurrency(Math.max(0, valorEntrada)),
    valorParcelas: roundCurrency(Math.max(0, valorParcelas)),
    quantidadeParcelas: QUANTIDADE_PARCELAS_SEM_JUROS,
    temSaldoFinal: false
  };
}

export function calcularPagamentoAVistaDinheiro(valorTotal: number): PagamentoAVistaDinheiroCalculation {
  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    throw new Error('Valor total deve ser maior que zero');
  }

  // Aplicar desconto de 5%
  const descontoAplicado = valorTotal * PERCENTUAL_DESCONTO_A_VISTA_DINHEIRO;
  const valorTotalComDesconto = valorTotal - descontoAplicado;

  // Calcular valores baseados no valor com desconto
  const valorEntrada = valorTotalComDesconto * PERCENTUAL_ENTRADA_A_VISTA_DINHEIRO;
  const valorSaldoFinal = valorTotalComDesconto - valorEntrada; // 80% restante

  return {
    valorTotal,
    valorTotalComDesconto: roundCurrency(Math.max(0, valorTotalComDesconto)),
    valorEntrada: roundCurrency(Math.max(0, valorEntrada)),
    valorSaldoFinal: roundCurrency(Math.max(0, valorSaldoFinal)),
    percentualDesconto: PERCENTUAL_DESCONTO_A_VISTA_DINHEIRO * 100,
    descontoAplicado: roundCurrency(Math.max(0, descontoAplicado))
  };
}

export function calcularPagamentoAVistaParcialCartao(params: PagamentoAVistaParcialCartaoParams): PagamentoAVistaParcialCartaoCalculation {
  const { valorTotal, quantidadeParcelas, taxaJuros = TAXA_JUROS_CARTAO_PADRAO } = params;

  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    throw new Error('Valor total deve ser maior que zero');
  }

  const parcelasNormalizadas = Math.trunc(
    clampNumber(Number.isFinite(quantidadeParcelas) ? quantidadeParcelas : 1, 1, MAX_PARCELAS_CARTAO)
  );

  const taxaNormalizada = clampNumber(
    Number.isFinite(taxaJuros) ? taxaJuros : TAXA_JUROS_CARTAO_PADRAO,
    0,
    MAX_COMPOUND_RATE
  );

  // Calcular entrada (20% do total)
  const valorEntrada = valorTotal * PERCENTUAL_ENTRADA_A_VISTA_PARCIAL_CARTAO;
  
  // Valor restante para parcelamento no cartão
  const valorRestante = Math.max(0, valorTotal - valorEntrada);
  
  // Calcular valor total com juros compostos
  const valorTotalComJuros = calcularJurosCompostos(valorRestante, taxaNormalizada, parcelasNormalizadas);
  
  // Valor de cada parcela do cartão
  const valorParcelaCartao = parcelasNormalizadas > 0 ? valorTotalComJuros / parcelasNormalizadas : 0;
  
  // Juros aplicados
  const jurosAplicados = valorTotalComJuros - valorRestante;

  return {
    valorTotal,
    valorEntrada: roundCurrency(Math.max(0, valorEntrada)),
    valorRestante: roundCurrency(Math.max(0, valorRestante)),
    valorParcelaCartao: roundCurrency(Math.max(0, valorParcelaCartao)),
    quantidadeParcelasCartao: parcelasNormalizadas,
    valorTotalComJuros: roundCurrency(Math.max(0, valorTotalComJuros)),
    jurosAplicados: roundCurrency(Math.max(0, jurosAplicados)),
    percentualJuros: taxaNormalizada * 100
  };
}

export function validarPagamentoIndaia(params: PagamentoIndaiaParams): string[] {
  const errors: string[] = [];

  if (!Number.isFinite(params.valorTotal) || params.valorTotal <= 0) {
    errors.push('Valor total deve ser maior que zero');
  }

  if (params.dataEvento <= new Date()) {
    errors.push('Data do evento deve ser no futuro');
  }

  const mesesRestantes = calcularMesesAteEvento(params.dataEvento, params.dataAtual);
  if (mesesRestantes < 1) {
    errors.push('Evento deve ter pelo menos 2 meses de antecedência para usar o Pagamento Indaiá');
  }

  return errors;
}

export function validarPagamentoSemJuros1mais4(valorTotal: number): string[] {
  const errors: string[] = [];

  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    errors.push('Valor total deve ser maior que zero');
  }

  return errors;
}

export function validarPagamentoAVistaDinheiro(valorTotal: number): string[] {
  const errors: string[] = [];

  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    errors.push('Valor total deve ser maior que zero');
  }

  return errors;
}

export function validarPagamentoAVistaParcialCartao(params: PagamentoAVistaParcialCartaoParams): string[] {
  const errors: string[] = [];

  if (!Number.isFinite(params.valorTotal) || params.valorTotal <= 0) {
    errors.push('Valor total deve ser maior que zero');
  }

  if (params.quantidadeParcelas < 1) {
    errors.push('Quantidade de parcelas deve ser pelo menos 1');
  }

  if (params.quantidadeParcelas > MAX_PARCELAS_CARTAO) {
    errors.push(`Quantidade de parcelas não pode exceder ${MAX_PARCELAS_CARTAO}`);
  }

  if (params.taxaJuros !== undefined && params.taxaJuros < 0) {
    errors.push('Taxa de juros não pode ser negativa');
  }

  return errors;
}

export function isPagamentoIndaiaValido(
  valorEntrada: number,
  valorTotal: number,
  dataEvento: Date
): boolean {
  try {
    const calculo = calcularPagamentoIndaia({ valorTotal, dataEvento });
    return valorEntrada >= calculo.valorEntrada;
  } catch {
    return false;
  }
}

export function getValorMinimoEntrada(valorTotal: number, dataEvento: Date): number {
  try {
    const calculo = calcularPagamentoIndaia({ valorTotal, dataEvento });
    return calculo.valorEntrada;
  } catch {
    return valorTotal * PERCENTUAL_ENTRADA;
  }
}

export function formatarResumoFinanceiro(calculo: PagamentoIndaiaCalculation): string {
  const entrada = calculo.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const parcelas = `${calculo.quantidadeParcelas}x de ${calculo.valorParcelas.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`;
  const saldo = calculo.valorSaldoFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

  return `Entrada: ${entrada} • ${parcelas} • Saldo: ${saldo} (30 dias antes do evento)`;
}

export function formatarResumoFinanceiroSemJuros1mais4(calculo: PagamentoSemJuros1mais4Calculation): string {
  const entrada = calculo.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const parcelas = `${calculo.quantidadeParcelas}x de ${calculo.valorParcelas.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`;

  return `Entrada: ${entrada} • ${parcelas}`;
}

export function formatarResumoFinanceiroAVistaDinheiro(calculo: PagamentoAVistaDinheiroCalculation): string {
  const entrada = calculo.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const saldo = calculo.valorSaldoFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

  return `Entrada: ${entrada} • Saldo à vista: ${saldo} (boleto)`;
}

export function formatarResumoFinanceiroAVistaParcialCartao(calculo: PagamentoAVistaParcialCartaoCalculation): string {
  const entrada = calculo.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const parcelas = `${calculo.quantidadeParcelasCartao}x de ${calculo.valorParcelaCartao.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`;
  const juros = `${calculo.percentualJuros.toFixed(2)}% a.m.`;

  return `Entrada: ${entrada} • ${parcelas} (${juros}) • Pagamento em até 30 dias`;
}

export function calcularCondicaoEspecialConsultor(params: CondicaoEspecialConsultorParams): CondicaoEspecialConsultorCalculation {
  const {
    valorTotal,
    valorEntrada,
    parcelasEntrada,
    parcelasIntermediarias,
    parcelasSaldoFinal = 1,
    taxaJuros = TAXA_JUROS_CONSULTOR_PADRAO,
    dataEvento
  } = params;

  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    throw new Error('Valor total deve ser maior que zero');
  }

  if (valorEntrada < VALOR_MINIMO_ENTRADA_CONSULTOR) {
    throw new Error(`Valor mínimo de entrada é ${VALOR_MINIMO_ENTRADA_CONSULTOR.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`);
  }

  if (parcelasEntrada < 1 || parcelasEntrada > MAX_PARCELAS_ENTRADA_SEM_JUROS) {
    throw new Error(`Parcelas da entrada devem ser entre 1 e ${MAX_PARCELAS_ENTRADA_SEM_JUROS}`);
  }

  if (parcelasIntermediarias < MIN_PARCELAS_PARA_CONSULTOR) {
    throw new Error(`Mínimo de ${MIN_PARCELAS_PARA_CONSULTOR} parcelas intermediárias para usar este modelo`);
  }

  if (parcelasSaldoFinal > MAX_PARCELAS_SALDO_FINAL_CONSULTOR) {
    throw new Error(`Máximo de ${MAX_PARCELAS_SALDO_FINAL_CONSULTOR}x para parcelas do saldo final`);
  }

  if (!Number.isFinite(taxaJuros) || taxaJuros < 0) {
    throw new Error('Taxa de juros não pode ser negativa');
  }

  const parcelasEntradaNormalizadas = Math.max(1, Math.trunc(parcelasEntrada));
  const parcelasIntermediariasNormalizadas = Math.max(1, Math.trunc(parcelasIntermediarias));
  const parcelasSaldoFinalNormalizadas = Math.max(1, Math.trunc(parcelasSaldoFinal));
  const taxaNormalizada = clampNumber(taxaJuros, 0, MAX_COMPOUND_RATE);

  // Calcular valor das parcelas da entrada (sem juros)
  const valorParcelaEntrada = parcelasEntradaNormalizadas > 0 ? valorEntrada / parcelasEntradaNormalizadas : valorEntrada;

  // Calcular valor restante após entrada
  const valorRestante = valorTotal - valorEntrada;

  // Calcular valor das parcelas intermediárias
  const valorParcelaIntermediaria = parcelasIntermediariasNormalizadas > 0 ? valorRestante / parcelasIntermediariasNormalizadas : 0;

  // Verificar se valor da parcela intermediária atende o mínimo
  if (parcelasIntermediariasNormalizadas > 0 && valorParcelaIntermediaria < VALOR_MINIMO_PARCELA_CONSULTOR) {
    throw new Error(`Valor mínimo de parcela é ${VALOR_MINIMO_PARCELA_CONSULTOR.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`);
  }

  // Calcular se há saldo final (quando não consegue dividir tudo em parcelas intermediárias)
  const valorTotalParcelas = valorParcelaIntermediaria * parcelasIntermediariasNormalizadas;
  const valorSaldoFinal = valorRestante - valorTotalParcelas;
  const temSaldoFinal = valorSaldoFinal > 0;

  // Se há saldo final e será parcelado, aplicar juros
  let valorParcelaSaldoFinal = 0;
  let valorTotalComJuros = valorTotal;
  let jurosAplicados = 0;

  if (temSaldoFinal && parcelasSaldoFinalNormalizadas > 1) {
    // Aplicar juros compostos no saldo final
    const valorSaldoComJuros = calcularJurosCompostos(valorSaldoFinal, taxaNormalizada, parcelasSaldoFinalNormalizadas);
    valorParcelaSaldoFinal = parcelasSaldoFinalNormalizadas > 0 ? valorSaldoComJuros / parcelasSaldoFinalNormalizadas : valorSaldoFinal;
    jurosAplicados = valorSaldoComJuros - valorSaldoFinal;
    valorTotalComJuros = valorTotal + jurosAplicados;
  } else if (temSaldoFinal) {
    valorParcelaSaldoFinal = valorSaldoFinal;
  }

  return {
    valorTotal,
    valorEntrada: roundCurrency(Math.max(0, valorEntrada)),
    parcelasEntrada: parcelasEntradaNormalizadas,
    valorParcelaEntrada: roundCurrency(Math.max(0, valorParcelaEntrada)),
    parcelasIntermediarias: parcelasIntermediariasNormalizadas,
    valorParcelaIntermediaria: roundCurrency(Math.max(0, valorParcelaIntermediaria)),
    valorSaldoFinal: roundCurrency(Math.max(0, valorSaldoFinal)),
    parcelasSaldoFinal: parcelasSaldoFinalNormalizadas,
    valorParcelaSaldoFinal: roundCurrency(Math.max(0, valorParcelaSaldoFinal)),
    valorTotalComJuros: roundCurrency(Math.max(0, valorTotalComJuros)),
    jurosAplicados: roundCurrency(Math.max(0, jurosAplicados)),
    percentualJuros: taxaNormalizada * 100,
    temSaldoFinal
  };
}

export function validarCondicaoEspecialConsultor(params: CondicaoEspecialConsultorParams): string[] {
  const errors: string[] = [];

  if (!Number.isFinite(params.valorTotal) || params.valorTotal <= 0) {
    errors.push('Valor total deve ser maior que zero');
  }

  if (params.valorEntrada < VALOR_MINIMO_ENTRADA_CONSULTOR) {
    errors.push(`Valor mínimo de entrada é ${VALOR_MINIMO_ENTRADA_CONSULTOR.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`);
  }

  if (params.parcelasEntrada < 1 || params.parcelasEntrada > MAX_PARCELAS_ENTRADA_SEM_JUROS) {
    errors.push(`Parcelas da entrada devem ser entre 1 e ${MAX_PARCELAS_ENTRADA_SEM_JUROS}`);
  }

  if (params.parcelasIntermediarias < MIN_PARCELAS_PARA_CONSULTOR) {
    errors.push(`Mínimo de ${MIN_PARCELAS_PARA_CONSULTOR} parcelas intermediárias para usar este modelo`);
  }

  if (params.parcelasSaldoFinal && params.parcelasSaldoFinal > MAX_PARCELAS_SALDO_FINAL_CONSULTOR) {
    errors.push(`Máximo de ${MAX_PARCELAS_SALDO_FINAL_CONSULTOR}x para parcelas do saldo final`);
  }

  if (params.taxaJuros !== undefined && params.taxaJuros < 0) {
    errors.push('Taxa de juros não pode ser negativa');
  }

  // Validar valor mínimo da parcela intermediária
  const valorRestante = params.valorTotal - params.valorEntrada;
  const valorParcelaIntermediaria = params.parcelasIntermediarias > 0 ? valorRestante / params.parcelasIntermediarias : 0;
  
  if (params.parcelasIntermediarias > 0 && valorParcelaIntermediaria < VALOR_MINIMO_PARCELA_CONSULTOR) {
    errors.push(`Valor da parcela intermediária seria ${valorParcelaIntermediaria.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}, mas o mínimo é ${VALOR_MINIMO_PARCELA_CONSULTOR.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`);
  }

  return errors;
}

export function formatarResumoFinanceiroCondicaoEspecialConsultor(calculo: CondicaoEspecialConsultorCalculation): string {
  const entrada = calculo.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const entradaFormatada = calculo.parcelasEntrada > 1 
    ? `${calculo.parcelasEntrada}x de ${calculo.valorParcelaEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} (sem juros)`
    : entrada;

  const parcelasIntermediarias = `${calculo.parcelasIntermediarias}x de ${calculo.valorParcelaIntermediaria.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`;

  let saldoFinal = '';
  if (calculo.temSaldoFinal) {
    if (calculo.parcelasSaldoFinal > 1) {
      const juros = `${calculo.percentualJuros.toFixed(2)}% a.m.`;
      saldoFinal = ` • Saldo: ${calculo.parcelasSaldoFinal}x de ${calculo.valorParcelaSaldoFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} (${juros})`;
    } else {
      saldoFinal = ` • Saldo: ${calculo.valorSaldoFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} à vista`;
    }
  }

  return `Entrada: ${entradaFormatada} • ${parcelasIntermediarias}${saldoFinal}`;
}

export function calcularPagamento5050(params: Pagamento5050Params): Pagamento5050Calculation {
  const { valorTotal, dataContrato, dataEvento, taxaJuros = 0.0129 } = params;

  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    throw new Error('Valor total deve ser maior que zero');
  }

  const taxaNormalizada = clampNumber(Number.isFinite(taxaJuros) ? taxaJuros : 0.0129, 0, MAX_COMPOUND_RATE);

  // Calcular valores básicos - dividir em duas partes iguais de 50%
  const valorEntrada = roundCurrency(Math.max(0, valorTotal * 0.20)); // 20% do total
  const valorPrimeiroBoleto = roundCurrency(Math.max(0, valorTotal * 0.30)); // 30% do total
  const valorSaldoBase = roundCurrency(Math.max(0, valorTotal * 0.50)); // 50% do total (segunda metade)

  // Calcular datas
  const dataPrimeiroBoleto = new Date(dataContrato);
  dataPrimeiroBoleto.setDate(dataPrimeiroBoleto.getDate() + 30);

  const dataSaldoFinal = new Date(dataEvento);
  dataSaldoFinal.setDate(dataSaldoFinal.getDate() - 30);

  // Calcular período de juros: apenas do boleto intermediário até o saldo final
  const diffMillis = dataSaldoFinal.getTime() - dataPrimeiroBoleto.getTime();
  const diasJuros = Math.max(0, Math.floor(diffMillis / (1000 * 60 * 60 * 24)));
  const mesesJuros = clampNumber(diasJuros / 30, 0, MAX_COMPOUND_PERIODS);

  // Aplicar juros compostos apenas no saldo final (50% restante)
  const valorSaldoFinalComJuros = roundCurrency(Math.max(0, calcularJurosCompostos(valorSaldoBase, taxaNormalizada, mesesJuros)));
  const jurosAplicados = roundCurrency(Math.max(0, valorSaldoFinalComJuros - valorSaldoBase));

  const valorTotalComJuros = roundCurrency(Math.max(0, valorEntrada + valorPrimeiroBoleto + valorSaldoFinalComJuros));

  return {
    valorTotal,
    valorEntrada,
    valorPrimeiroBoleto,
    valorSaldoFinal: valorSaldoFinalComJuros,
    valorTotalComJuros,
    jurosAplicados,
    percentualJuros: taxaNormalizada * 100,
    dataPrimeiroBoleto,
    dataSaldoFinal
  };
}

export function validarPagamento5050(params: Pagamento5050Params): string[] {
  const { valorTotal, dataContrato, dataEvento } = params;
  const errors: string[] = [];
  
  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    errors.push('Valor total deve ser maior que zero');
  }
  
  if (dataEvento <= dataContrato) {
    errors.push('Data do evento deve ser posterior à data do contrato');
  }
  
  // Verificar se há tempo suficiente (pelo menos 60 dias entre contrato e evento)
  const diasDiferenca = Math.floor((dataEvento.getTime() - dataContrato.getTime()) / (1000 * 60 * 60 * 24));
  if (diasDiferenca < 60) {
    errors.push('Deve haver pelo menos 60 dias entre a data do contrato e a data do evento para o modelo 50/50');
  }
  
  return errors;
}

export function formatarResumoFinanceiro5050(calculo: Pagamento5050Calculation): string {
  const entrada = calculo.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const primeiroBoleto = calculo.valorPrimeiroBoleto.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const saldoFinal = calculo.valorSaldoFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  
  return `Entrada: ${entrada} • Boleto 30d: ${primeiroBoleto} • Saldo final: ${saldoFinal} (c/ juros)`;
}
