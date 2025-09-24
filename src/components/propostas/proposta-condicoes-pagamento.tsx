import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  calcularPagamentoIndaia,
  formatarResumoFinanceiro,
  validarPagamentoIndaia,
  getValorMinimoEntrada,
  calcularPagamentoSemJuros1mais4,
  formatarResumoFinanceiroSemJuros1mais4,
  validarPagamentoSemJuros1mais4,
  calcularPagamentoAVistaDinheiro,
  formatarResumoFinanceiroAVistaDinheiro,
  validarPagamentoAVistaDinheiro,
  calcularPagamentoAVistaParcialCartao,
  formatarResumoFinanceiroAVistaParcialCartao,
  validarPagamentoAVistaParcialCartao,
  calcularCondicaoEspecialConsultor,
  formatarResumoFinanceiroCondicaoEspecialConsultor,
  validarCondicaoEspecialConsultor,
  calcularPagamento5050,
  formatarResumoFinanceiro5050,
  validarPagamento5050,
  type PagamentoSemJuros1mais4Calculation,
  type PagamentoAVistaDinheiroCalculation,
  type PagamentoAVistaParcialCartaoCalculation,
  type CondicaoEspecialConsultorCalculation,
  type Pagamento5050Calculation
} from '@/lib/payment-calculations';
import { AlertCircle, Calculator, Lock, Calendar, Settings } from 'lucide-react';

export interface CondicoesPagamentoState {
  modeloPagamento: string;
  reajuste: 'Sim' | 'Não';
  juros: number;
  valorEntrada: number;
  dataEntrada: string;
  formaPagamentoEntrada: string;
  statusPagamentoEntrada: string;
  qtdMeses: number;
  diaVencimento: number;
  formaSaldoFinal: string;
  clausulas: string;
  observacao: string;
  entrada: 'Sim' | 'Não';
  negociacao: string;
  // Campos específicos para Pagamento Indaiá
  valorTotalComJuros?: number;
  valorSaldoFinal?: number;
  calculoAutomatico?: boolean;
  modoManual?: boolean;
}

interface Props {
  totalProposta: number;
  onValorEntradaChange: (value: number) => void;
  onCondicoesPagamentoChange?: (condicoes: CondicoesPagamentoState) => void;
  initialValues?: Partial<CondicoesPagamentoState>;
  dataEvento?: Date; // Data do evento para cálculos do Pagamento Indaiá
}

function shallowEqualObjects<T extends Record<string, unknown>>(a: T | null | undefined, b: T | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
      return false;
    }
  }

  return true;
}

const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const areCondicoesEqual = (a: CondicoesPagamentoState, b: CondicoesPagamentoState) => shallowEqualObjects(a as unknown as Record<string, unknown>, b as unknown as Record<string, unknown>);

export function PropostaCondicoesPagamento({ totalProposta, onValorEntradaChange, onCondicoesPagamentoChange, initialValues, dataEvento }: Props) {
  const modeloOptions = [
    'Pagamento Indaiá',
    'Sem Juros (1+4)',
    'À vista (Dinheiro)',
    'À vista Parcial (Cartão de Crédito)',
    'Condição Especial do Consultor',
    '50/50'
  ];

  const [state, setState] = useState<CondicoesPagamentoState>({
    modeloPagamento: initialValues?.modeloPagamento || modeloOptions[0],
    reajuste: initialValues?.reajuste || 'Não',
    juros: initialValues?.juros || 0,
    valorEntrada: initialValues?.valorEntrada || 0,
    dataEntrada: initialValues?.dataEntrada || '',
    formaPagamentoEntrada: initialValues?.formaPagamentoEntrada || '',
    statusPagamentoEntrada: initialValues?.statusPagamentoEntrada || '',
    qtdMeses: initialValues?.qtdMeses || 1,
    diaVencimento: initialValues?.diaVencimento || 5,
    formaSaldoFinal: initialValues?.formaSaldoFinal || '',
    clausulas: initialValues?.clausulas || '',
    observacao: initialValues?.observacao || '',
    entrada: initialValues?.entrada || 'Não',
    negociacao: initialValues?.negociacao || '',
    valorTotalComJuros: initialValues?.valorTotalComJuros || 0,
    valorSaldoFinal: initialValues?.valorSaldoFinal || 0,
    calculoAutomatico: initialValues?.calculoAutomatico || false,
    modoManual: initialValues?.modoManual || false
  });

  const [indaiaCalculation, setIndaiaCalculation] = useState<any>(null);
  const [semJuros1mais4Calculation, setSemJuros1mais4Calculation] = useState<PagamentoSemJuros1mais4Calculation | null>(null);
  const [aVistaDinheiroCalculation, setAVistaDinheiroCalculation] = useState<PagamentoAVistaDinheiroCalculation | null>(null);
  const [aVistaParcialCartaoCalculation, setAVistaParcialCartaoCalculation] = useState<PagamentoAVistaParcialCartaoCalculation | null>(null);
  const [condicaoEspecialConsultorCalculation, setCondicaoEspecialConsultorCalculation] = useState<CondicaoEspecialConsultorCalculation | null>(null);
  const [pagamento5050Calculation, setPagamento5050Calculation] = useState<Pagamento5050Calculation | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeCalculations, setActiveCalculations] = useState(0);
  const isCalculating = activeCalculations > 0;

  const beginCalculation = useCallback(() => {
    setActiveCalculations(prev => prev + 1);
  }, [setActiveCalculations]);

  const endCalculation = useCallback(() => {
    setActiveCalculations(prev => (prev > 0 ? prev - 1 : 0));
  }, [setActiveCalculations]);

  const updateState = useCallback((compute: (prev: CondicoesPagamentoState) => CondicoesPagamentoState) => {
    setState(prev => {
      const next = compute(prev);
      return areCondicoesEqual(prev, next) ? prev : next;
    });
  }, [setState]);

  const setValidationErrorsSafe = useCallback((errors: string[]) => {
    setValidationErrors(prev => (arraysEqual(prev, errors) ? prev : errors));
  }, [setValidationErrors]);

  const lastEmittedStateRef = useRef(state);
  const lastValorEntradaRef = useRef(state.valorEntrada);

  const formaPgtoOptions = ['PIX','Cartão de Crédito (Máquina)','Cartão de Crédito (Vindi)','Boleto (Vindi)','Dinheiro','TED'];
  const statusPgtoOptions = ['Realizado durante a reunião','Será realizado com o Pós Vendas'];
  const formaSaldoFinalOptions = ['Visa','Mastercard','Elo','American Express','A ser pago até 30 dias antes do evento'];
  const negociacaoOptions = ['Imediato','Pós Reunião','Ação Gerente','Corporativo'];

  const isPagamentoIndaia = state.modeloPagamento === 'Pagamento Indaiá';
  const isSemJuros1mais4 = state.modeloPagamento === 'Sem Juros (1+4)';
  const isAVistaDinheiro = state.modeloPagamento === 'À vista (Dinheiro)';
  const isAVistaParcialCartao = state.modeloPagamento === 'À vista Parcial (Cartão de Crédito)';
  const isCondicaoEspecialConsultor = state.modeloPagamento === 'Condição Especial do Consultor';
  const is5050 = state.modeloPagamento === '50/50';

  const valorMinimoOriginal = useMemo(() => {
    if (!isPagamentoIndaia || !dataEvento) {
      return 0;
    }
    return getValorMinimoEntrada(totalProposta, dataEvento);
  }, [isPagamentoIndaia, totalProposta, dataEvento]);

  useEffect(() => {
    if (onCondicoesPagamentoChange && !areCondicoesEqual(lastEmittedStateRef.current, state)) {
      lastEmittedStateRef.current = state;
      onCondicoesPagamentoChange(state);
    }
  }, [state, onCondicoesPagamentoChange]);

  useEffect(() => {
    if (state.valorEntrada !== lastValorEntradaRef.current) {
      lastValorEntradaRef.current = state.valorEntrada;
      onValorEntradaChange(state.valorEntrada);
    }
  }, [state.valorEntrada, onValorEntradaChange]);

  // Funções específicas para controle de bloqueio de campos
  const isFieldAlwaysLocked = (field: string) => {
    // Campos sempre bloqueados no Pagamento Indaiá
    if (isPagamentoIndaia && ['juros', 'reajuste', 'formaSaldoFinal'].includes(field)) {
      return true;
    }
    // Campos sempre bloqueados no Sem Juros (1+4)
    if (isSemJuros1mais4 && ['juros', 'reajuste', 'formaSaldoFinal', 'valorSaldoFinal', 'qtdMeses', 'valorEntrada'].includes(field)) {
      return true;
    }
    // Campos sempre bloqueados no À vista (Dinheiro)
    if (isAVistaDinheiro && ['juros', 'reajuste', 'qtdMeses', 'valorEntrada', 'valorSaldoFinal'].includes(field)) {
      return true;
    }
    // Campos sempre bloqueados no À vista Parcial (Cartão de Crédito)
    if (isAVistaParcialCartao && ['valorEntrada', 'valorSaldoFinal', 'formaSaldoFinal'].includes(field)) {
      return true;
    }
    // Condição Especial do Consultor - campos flexíveis, apenas reajuste é sempre sim
    if (isCondicaoEspecialConsultor && ['reajuste'].includes(field)) {
      return true;
    }
    // 50/50 - entrada e saldo final fixos, apenas reajuste é sempre sim
    if (is5050 && ['valorEntrada', 'valorSaldoFinal', 'reajuste', 'qtdMeses'].includes(field)) {
      return true;
    }
    return false;
  };

  const isFieldNeverEditable = (field: string) => {
    // Campos nunca editáveis no Pagamento Indaiá (nem no modo manual)
    if (isPagamentoIndaia && ['valorSaldoFinal'].includes(field)) {
      return true;
    }
    return false;
  };

  const isFieldLocked = (field: string) => {
    return isFieldAlwaysLocked(field) || isFieldNeverEditable(field);
  };

  // Função para calcular data do saldo final (30 dias antes do evento)
  const getDataSaldoFinal = () => {
    if (!dataEvento) return null;
    const dataSaldo = new Date(dataEvento);
    dataSaldo.setDate(dataSaldo.getDate() - 30);
    return dataSaldo;
  };



  // Recalcular valores quando Pagamento Indaiá for selecionado
  useEffect(() => {
    if (isPagamentoIndaia && dataEvento && totalProposta > 0) {
      beginCalculation();
      try {
        const errors = validarPagamentoIndaia({ valorTotal: totalProposta, dataEvento });
        setValidationErrorsSafe(errors);

        if (errors.length === 0) {
          const calculation = calcularPagamentoIndaia({ valorTotal: totalProposta, dataEvento });

          setIndaiaCalculation(prev => (
            prev && shallowEqualObjects(prev as unknown as Record<string, unknown>, calculation as unknown as Record<string, unknown>) ? prev : calculation
          ));

          updateState(prev => ({
            ...prev,
            calculoAutomatico: true,
            entrada: 'Sim',
            reajuste: 'Sim',
            juros: calculation.percentualJuros,
            valorEntrada: calculation.valorEntrada,
            qtdMeses: calculation.quantidadeParcelas,
            valorSaldoFinal: calculation.valorSaldoFinal,
            valorTotalComJuros: calculation.valorTotalComJuros,
            formaSaldoFinal: 'A ser pago até 30 dias antes do evento'
          }));
        }
      } catch (error) {
        console.error('Erro ao calcular Pagamento Indaiá:', error);
        setValidationErrorsSafe(['Erro no cálculo do Pagamento Indaiá']);
      } finally {
        endCalculation();
      }
    } else if (!isPagamentoIndaia) {
      setIndaiaCalculation(prev => (prev === null ? prev : null));
      setValidationErrorsSafe([]);
      if (state.calculoAutomatico) {
        updateState(prev => ({
          ...prev,
          calculoAutomatico: false,
          juros: 0,
          reajuste: 'Não'
        }));
      }
    }
  }, [isPagamentoIndaia, totalProposta, dataEvento, beginCalculation, endCalculation, setValidationErrorsSafe, updateState, state.calculoAutomatico]);

  // Recalcular valores quando Sem Juros (1+4) for selecionado
  useEffect(() => {
    if (isSemJuros1mais4 && totalProposta > 0) {
      beginCalculation();
      try {
        const errors = validarPagamentoSemJuros1mais4(totalProposta);
        setValidationErrorsSafe(errors);

        if (errors.length === 0) {
          const calculation = calcularPagamentoSemJuros1mais4(totalProposta);
          setSemJuros1mais4Calculation(prev => (
            prev && shallowEqualObjects(prev as unknown as Record<string, unknown>, calculation as unknown as Record<string, unknown>) ? prev : calculation
          ));

          updateState(prev => ({
            ...prev,
            calculoAutomatico: true,
            entrada: 'Sim',
            reajuste: 'Não',
            juros: 0,
            valorEntrada: calculation.valorEntrada,
            qtdMeses: calculation.quantidadeParcelas,
            valorSaldoFinal: 0,
            formaSaldoFinal: '',
            valorTotalComJuros: calculation.valorTotal
          }));
        }
      } catch (error) {
        console.error('Erro ao calcular Pagamento Sem Juros (1+4):', error);
        setValidationErrorsSafe(['Erro no cálculo do Pagamento Sem Juros (1+4)']);
      } finally {
        endCalculation();
      }
    } else if (!isSemJuros1mais4) {
      setSemJuros1mais4Calculation(prev => (prev === null ? prev : null));
      if (!isPagamentoIndaia) {
        setValidationErrorsSafe([]);
      }
    }
  }, [isSemJuros1mais4, totalProposta, beginCalculation, endCalculation, setValidationErrorsSafe, updateState, isPagamentoIndaia]);

  // Recalcular valores quando À vista (Dinheiro) for selecionado
  useEffect(() => {
    if (isAVistaDinheiro && totalProposta > 0) {
      beginCalculation();
      try {
        const errors = validarPagamentoAVistaDinheiro(totalProposta);
        setValidationErrorsSafe(errors);

        if (errors.length === 0) {
          const calculation = calcularPagamentoAVistaDinheiro(totalProposta);
          setAVistaDinheiroCalculation(prev => (
            prev && shallowEqualObjects(prev as unknown as Record<string, unknown>, calculation as unknown as Record<string, unknown>) ? prev : calculation
          ));

          updateState(prev => ({
            ...prev,
            calculoAutomatico: true,
            entrada: 'Sim',
            reajuste: 'Não',
            juros: 0,
            valorEntrada: calculation.valorEntrada,
            qtdMeses: 1,
            valorSaldoFinal: calculation.valorSaldoFinal,
            formaSaldoFinal: 'Boleto',
            valorTotalComJuros: calculation.valorTotalComDesconto
          }));
        }
      } catch (error) {
        console.error('Erro ao calcular Pagamento À vista (Dinheiro):', error);
        setValidationErrorsSafe(['Erro no cálculo do Pagamento À vista (Dinheiro)']);
      } finally {
        endCalculation();
      }
    } else if (!isAVistaDinheiro) {
      setAVistaDinheiroCalculation(prev => (prev === null ? prev : null));
      if (!isPagamentoIndaia && !isSemJuros1mais4) {
        setValidationErrorsSafe([]);
      }
    }
  }, [isAVistaDinheiro, totalProposta, beginCalculation, endCalculation, setValidationErrorsSafe, updateState, isPagamentoIndaia, isSemJuros1mais4]);

  // Recalcular valores quando À vista Parcial (Cartão de Crédito) for selecionado
  useEffect(() => {
    if (isAVistaParcialCartao && totalProposta > 0) {
      beginCalculation();
      try {
        // Usar valores padrão se não especificados
        const quantidadeParcelas = state.qtdMeses || 1;
        const taxaJuros = state.juros > 0 ? state.juros / 100 : 0.0129; // Usar 1,29% padrão se juros não definido

        const errors = validarPagamentoAVistaParcialCartao({
          valorTotal: totalProposta,
          quantidadeParcelas,
          taxaJuros
        });
        setValidationErrorsSafe(errors);

        if (errors.length === 0) {
          const calculation = calcularPagamentoAVistaParcialCartao({
            valorTotal: totalProposta,
            quantidadeParcelas,
            taxaJuros
          });
          setAVistaParcialCartaoCalculation(prev => (
            prev && shallowEqualObjects(prev as unknown as Record<string, unknown>, calculation as unknown as Record<string, unknown>) ? prev : calculation
          ));

          const dataPagamento = new Date();
          dataPagamento.setDate(dataPagamento.getDate() + 30);

          updateState(prev => ({
            ...prev,
            calculoAutomatico: true,
            entrada: 'Sim',
            reajuste: 'Sim',
            juros: calculation.percentualJuros,
            valorEntrada: calculation.valorEntrada,
            qtdMeses: calculation.quantidadeParcelasCartao,
            valorSaldoFinal: 0,
            formaSaldoFinal: 'Cartão de Crédito (Vindi)',
            valorTotalComJuros: calculation.valorTotalComJuros,
            diaVencimento: dataPagamento.getDate()
          }));
        }
      } catch (error) {
        console.error('Erro ao calcular Pagamento À vista Parcial (Cartão de Crédito):', error);
        setValidationErrorsSafe(['Erro no cálculo do Pagamento À vista Parcial (Cartão de Crédito)']);
      } finally {
        endCalculation();
      }
    } else if (!isAVistaParcialCartao) {
      setAVistaParcialCartaoCalculation(prev => (prev === null ? prev : null));
      if (!isPagamentoIndaia && !isSemJuros1mais4 && !isAVistaDinheiro) {
        setValidationErrorsSafe([]);
      }
    }
  }, [isAVistaParcialCartao, totalProposta, state.qtdMeses, state.juros, beginCalculation, endCalculation, setValidationErrorsSafe, updateState, isPagamentoIndaia, isSemJuros1mais4, isAVistaDinheiro]);

  // Recalcular valores quando Condição Especial do Consultor for selecionado
  useEffect(() => {
    if (isCondicaoEspecialConsultor && totalProposta > 0) {
      beginCalculation();
      try {
        // Usar valores padrão se não especificados
        const valorEntrada = state.valorEntrada || 1000; // Mínimo R$ 1.000
        const parcelasEntrada = 1; // Padrão 1x (pode ser editado até 12x)
        const parcelasIntermediarias = state.qtdMeses || 1;
        const valorParcelaIntermediaria = 600; // Mínimo R$ 600
        const parcelasSaldoFinal = 1; // Padrão 1x (pode ser editado até 18x)
        const percentualJuros = state.juros > 0 ? state.juros / 100 : 0.0129; // 1,29% padrão

        const errors = validarCondicaoEspecialConsultor({
          valorTotal: totalProposta,
          valorEntrada,
          parcelasEntrada,
          parcelasIntermediarias,
          parcelasSaldoFinal,
          taxaJuros: percentualJuros,
          dataEvento
        });
        setValidationErrorsSafe(errors);

        if (errors.length === 0) {
          const calculation = calcularCondicaoEspecialConsultor({
            valorTotal: totalProposta,
            valorEntrada,
            parcelasEntrada,
            parcelasIntermediarias,
            parcelasSaldoFinal,
            taxaJuros: percentualJuros,
            dataEvento
          });
          setCondicaoEspecialConsultorCalculation(prev => (
            prev && shallowEqualObjects(prev as unknown as Record<string, unknown>, calculation as unknown as Record<string, unknown>) ? prev : calculation
          ));

          updateState(prev => ({
            ...prev,
            calculoAutomatico: true,
            entrada: 'Sim',
            reajuste: 'Sim',
            juros: calculation.percentualJuros,
            valorEntrada: calculation.valorEntrada,
            qtdMeses: calculation.parcelasIntermediarias,
            valorSaldoFinal: calculation.valorSaldoFinal,
            valorTotalComJuros: calculation.valorTotalComJuros
          }));
        }
      } catch (error) {
        console.error('Erro ao calcular Condição Especial do Consultor:', error);
        setValidationErrorsSafe(['Erro no cálculo da Condição Especial do Consultor']);
      } finally {
        endCalculation();
      }
    } else if (!isCondicaoEspecialConsultor) {
      setCondicaoEspecialConsultorCalculation(prev => (prev === null ? prev : null));
      if (!isPagamentoIndaia && !isSemJuros1mais4 && !isAVistaDinheiro && !isAVistaParcialCartao) {
        setValidationErrorsSafe([]);
      }
    }
  }, [isCondicaoEspecialConsultor, totalProposta, state.valorEntrada, state.qtdMeses, state.juros, beginCalculation, endCalculation, setValidationErrorsSafe, updateState, isPagamentoIndaia, isSemJuros1mais4, isAVistaDinheiro, isAVistaParcialCartao]);

  // Recalcular valores quando 50/50 for selecionado
  useEffect(() => {
    if (is5050 && totalProposta > 0 && dataEvento) {
      beginCalculation();
      try {
        // Usar data de hoje como data do contrato
        const dataContrato = new Date();
        const taxaJuros = state.juros > 0 ? state.juros / 100 : 0.0129; // 1,29% padrão

        const errors = validarPagamento5050({
          valorTotal: totalProposta,
          dataContrato,
          dataEvento,
          taxaJuros
        });
        setValidationErrorsSafe(errors);

        if (errors.length === 0) {
          const calculation = calcularPagamento5050({
            valorTotal: totalProposta,
            dataContrato,
            dataEvento,
            taxaJuros
          });
          setPagamento5050Calculation(prev => (
            prev && shallowEqualObjects(prev as unknown as Record<string, unknown>, calculation as unknown as Record<string, unknown>) ? prev : calculation
          ));

          updateState(prev => ({
            ...prev,
            calculoAutomatico: true,
            entrada: 'Sim',
            reajuste: 'Sim',
            juros: calculation.percentualJuros,
            valorEntrada: calculation.valorEntrada,
            qtdMeses: 1,
            valorSaldoFinal: calculation.valorSaldoFinal,
            valorTotalComJuros: calculation.valorTotalComJuros,
            formaSaldoFinal: 'Boleto (Vindi)'
          }));
        }
      } catch (error) {
        console.error('Erro ao calcular Pagamento 50/50:', error);
        setValidationErrorsSafe(['Erro no cálculo do Pagamento 50/50']);
      } finally {
        endCalculation();
      }
    } else if (!is5050) {
      setPagamento5050Calculation(prev => (prev === null ? prev : null));
      if (!isPagamentoIndaia && !isSemJuros1mais4 && !isAVistaDinheiro && !isAVistaParcialCartao && !isCondicaoEspecialConsultor) {
        setValidationErrorsSafe([]);
      }
    }
  }, [is5050, totalProposta, dataEvento, state.juros, beginCalculation, endCalculation, setValidationErrorsSafe, updateState, isPagamentoIndaia, isSemJuros1mais4, isAVistaDinheiro, isAVistaParcialCartao, isCondicaoEspecialConsultor]);

  const valorRestante = useMemo(() => {
    if (isPagamentoIndaia && indaiaCalculation) {
      return indaiaCalculation.valorTotalComJuros - state.valorEntrada - (state.valorSaldoFinal || 0);
    }
    return Math.max(totalProposta - state.valorEntrada, 0);
  }, [isPagamentoIndaia, indaiaCalculation, state.valorEntrada, state.valorSaldoFinal, totalProposta]);

  const valorParcela = useMemo(() => {
    if (state.qtdMeses > 0 && Number.isFinite(valorRestante)) {
      return Math.round((valorRestante / state.qtdMeses) * 100) / 100;
    }
    return 0;
  }, [valorRestante, state.qtdMeses]);

  const resumoSimulador = () => {
    if (isPagamentoIndaia && indaiaCalculation) {
      return formatarResumoFinanceiro(indaiaCalculation);
    }

    if (isSemJuros1mais4 && semJuros1mais4Calculation) {
      return formatarResumoFinanceiroSemJuros1mais4(semJuros1mais4Calculation);
    }

    if (isAVistaDinheiro && aVistaDinheiroCalculation) {
      return formatarResumoFinanceiroAVistaDinheiro(aVistaDinheiroCalculation);
    }

    if (isAVistaParcialCartao && aVistaParcialCartaoCalculation) {
      return formatarResumoFinanceiroAVistaParcialCartao(aVistaParcialCartaoCalculation);
    }

    if (isCondicaoEspecialConsultor && condicaoEspecialConsultorCalculation) {
      return formatarResumoFinanceiroCondicaoEspecialConsultor(condicaoEspecialConsultorCalculation);
    }

    if (is5050 && pagamento5050Calculation) {
      return formatarResumoFinanceiro5050(pagamento5050Calculation);
    }

    const entradaTxt = state.entrada === 'Sim' && state.valorEntrada > 0
      ? `Entrada de ${state.valorEntrada.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} via ${state.formaPagamentoEntrada || '-'} (${state.statusPagamentoEntrada||'-'})`
      : 'Sem entrada';

    const parcelasTxt = valorRestante > 0 && state.qtdMeses > 0
      ? `${state.qtdMeses}x de ${valorParcela.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`
      : '';

    return `${entradaTxt}${parcelasTxt ? ' • ' + parcelasTxt : ''}`;
  };

  const handleChange = (field: keyof CondicoesPagamentoState, value: any) => {
    if (isFieldLocked(field)) {
      return;
    }

    updateState(prev => {
      let next = { ...prev };

      if (field === 'reajuste') {
        if (value === 'Não') {
          next = { ...prev, reajuste: value, juros: 0 };
        } else {
          next = { ...prev, [field]: value };
        }
      } else if (field === 'valorEntrada') {
        const num = value === '' ? 0 : Number(value);
        next = { ...prev, valorEntrada: Number.isFinite(num) ? num : 0 };
      } else if (field === 'qtdMeses') {
        next = { ...prev, [field]: Number(value) };
      } else if (field === 'juros') {
        next = { ...prev, [field]: Number(value) };
      } else if (field === 'valorSaldoFinal') {
        const num = value === '' ? 0 : Number(value);
        next = { ...prev, valorSaldoFinal: Number.isFinite(num) ? num : 0 };
      } else if (field === 'modeloPagamento') {
        const calculoAutomatico = value === 'Pagamento Indaiá' || value === 'Sem Juros (1+4)' || value === 'À vista (Dinheiro)' || value === 'À vista Parcial (Cartão de Crédito)' || value === 'Condição Especial do Consultor' || value === '50/50';
        next = {
          ...prev,
          [field]: value,
          calculoAutomatico,
          modoManual: false
        };
      } else {
        next = { ...prev, [field]: value };
      }

      return next;
    });
  };

  return (
    <div className="border rounded overflow-hidden">
      <div className="bg-zinc-200 dark:bg-zinc-800 text-center font-semibold py-1 relative">
        Financeiro
        {isCalculating && (
          <span className="absolute right-2 top-1 text-xs text-orange-600 animate-pulse">
            Calculando...
          </span>
        )}
      </div>

      {/* Alertas de validação */}
      {validationErrors.length > 0 && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-800">Problemas encontrados:</span>
          </div>
          <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Resumo do Pagamento Indaiá */}
      {isPagamentoIndaia && indaiaCalculation && (
        <div className="mx-4 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-800">
                {state.modoManual ? 'Modo Manual - Pagamento Indaiá' : 'Pagamento Indaiá'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-blue-600">Manual</span>
              <Switch
                checked={state.modoManual || false}
                onCheckedChange={(checked) => handleChange('modoManual', checked)}
              />
            </div>
          </div>
          <div className="text-sm text-blue-700">
            <div>Total original: {totalProposta.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Total com juros: {isCalculating ? <span className="text-orange-600 animate-pulse">Calculando...</span> : indaiaCalculation.valorTotalComJuros.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Juros aplicados: {isCalculating ? <span className="text-orange-600 animate-pulse">Calculando...</span> : `${indaiaCalculation.jurosAplicados.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} (${indaiaCalculation.percentualJuros}% ao mês)`}</div>
            {state.modoManual && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                <strong>Modo Manual Ativo:</strong> Você pode editar as parcelas e valores, mas deve respeitar as regras do Pagamento Indaiá.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resumo do Pagamento Sem Juros (1+4) */}
      {isSemJuros1mais4 && semJuros1mais4Calculation && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-800">
              Pagamento Sem Juros (1+4) - Entrada + 4 Parcelas Fixas
            </span>
          </div>
          <div className="text-sm text-green-700">
            <div>Total: {totalProposta.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Entrada (20%): {semJuros1mais4Calculation.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>4 Parcelas fixas de: {semJuros1mais4Calculation.valorParcelas.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} cada</div>
            <div className="mt-2 text-xs text-green-600 bg-green-100 p-2 rounded border border-green-300">
              <strong>✓ Sem juros:</strong> Pagamento dividido igualmente sem acréscimos
            </div>
          </div>
        </div>
      )}

      {/* Resumo do Pagamento À vista (Dinheiro) - 5% desconto */}
      {isAVistaDinheiro && aVistaDinheiroCalculation && (
        <div className="mx-4 mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-800">
              À vista (Dinheiro) - 5% de Desconto
            </span>
          </div>
          <div className="text-sm text-orange-700">
            <div>Total original: {totalProposta.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Desconto aplicado (5%): -{aVistaDinheiroCalculation.descontoAplicado.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Total com desconto: {aVistaDinheiroCalculation.valorTotalComDesconto.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Entrada (20%): {aVistaDinheiroCalculation.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Saldo à vista (80%): {aVistaDinheiroCalculation.valorSaldoFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div className="mt-2 text-xs text-orange-600 bg-orange-100 p-2 rounded border border-orange-300">
              <strong>💰 5% de desconto:</strong> Entrada + saldo à vista via boleto
            </div>
          </div>
        </div>
      )}

      {/* Resumo do Pagamento À vista Parcial (Cartão de Crédito) */}
      {isAVistaParcialCartao && aVistaParcialCartaoCalculation && (
        <div className="mx-4 mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-800">
              À vista Parcial (Cartão de Crédito) - Juros {aVistaParcialCartaoCalculation.percentualJuros.toFixed(2)}% a.m.
            </span>
          </div>
          <div className="text-sm text-purple-700">
            <div>Total original: {totalProposta.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Entrada (20%): {aVistaParcialCartaoCalculation.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Restante no cartão: {aVistaParcialCartaoCalculation.valorRestante.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>{aVistaParcialCartaoCalculation.quantidadeParcelasCartao}x de {aVistaParcialCartaoCalculation.valorParcelaCartao.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} (com juros)</div>
            <div>Total com juros: {aVistaParcialCartaoCalculation.valorTotalComJuros.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div className="mt-2 text-xs text-purple-600 bg-purple-100 p-2 rounded border border-purple-300">
              <strong>💳 Cartão em até 18x:</strong> Entrada + parcelamento no cartão com juros • Pagamento em até 30 dias
            </div>
          </div>
        </div>
      )}

      {/* Resumo da Condição Especial do Consultor */}
      {isCondicaoEspecialConsultor && condicaoEspecialConsultorCalculation && (
        <div className="mx-4 mt-4 p-3 bg-teal-50 border border-teal-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-teal-500" />
            <span className="text-sm font-medium text-teal-800">
              Condição Especial do Consultor - Flexibilidade Total
            </span>
          </div>
          <div className="text-sm text-teal-700">
            <div>Total original: {totalProposta.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Entrada: {condicaoEspecialConsultorCalculation.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} em {condicaoEspecialConsultorCalculation.parcelasEntrada}x sem juros</div>
            <div>Parcelas intermediárias: {condicaoEspecialConsultorCalculation.parcelasIntermediarias}x de {condicaoEspecialConsultorCalculation.valorParcelaIntermediaria.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            {condicaoEspecialConsultorCalculation.temSaldoFinal && (
              <div>Saldo final: {condicaoEspecialConsultorCalculation.valorSaldoFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} em {condicaoEspecialConsultorCalculation.parcelasSaldoFinal}x com juros</div>
            )}
            <div>Total com juros: {condicaoEspecialConsultorCalculation.valorTotalComJuros.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div className="mt-2 text-xs text-teal-600 bg-teal-100 p-2 rounded border border-teal-300">
              <strong>🔧 Flexível:</strong> Entrada mín R$ 1.000 (até 12x) • Parcelas mín R$ 600 • Saldo até 18x com juros
            </div>
          </div>
        </div>
      )}

      {/* Resumo do Pagamento 50/50 */}
      {is5050 && pagamento5050Calculation && (
        <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-800">
              Pagamento 50/50 - Juros {pagamento5050Calculation.percentualJuros.toFixed(2)}% a.m.
            </span>
          </div>
          <div className="text-sm text-amber-700">
            <div>Total original: {totalProposta.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Entrada (20%): {pagamento5050Calculation.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Boleto 30 dias (30%): {pagamento5050Calculation.valorPrimeiroBoleto.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} - {pagamento5050Calculation.dataPrimeiroBoleto.toLocaleDateString('pt-BR')}</div>
            <div>Saldo final (50% + juros): {pagamento5050Calculation.valorSaldoFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} - {pagamento5050Calculation.dataSaldoFinal.toLocaleDateString('pt-BR')}</div>
            <div>Juros aplicados: +{pagamento5050Calculation.jurosAplicados.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div>Total com juros: {pagamento5050Calculation.valorTotalComJuros.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
            <div className="mt-2 text-xs text-amber-600 bg-amber-100 p-2 rounded border border-amber-300">
              <strong>📊 50/50:</strong> Entrada 20% • Boleto 30% em 30d • Saldo 50% (30d antes evento) com juros
            </div>
          </div>
        </div>
      )}

      {/* Modelo de Pagamento */}
      <div className="p-4 grid md:grid-cols-4 gap-4 border-b">
        <div className="col-span-1 space-y-1">
          <label className="text-sm font-medium">Modelo de Pagamento</label>
          <Select value={state.modeloPagamento} onValueChange={val=>handleChange('modeloPagamento', val as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {modeloOptions.map(op => (
                <SelectItem key={op} value={op}>{op}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 space-y-1">
          <label className="text-sm font-medium flex items-center gap-1">
            Juros aplicado
            {isFieldLocked('reajuste') && <Lock className="h-3 w-3 text-muted-foreground" />}
          </label>
          <Select value={state.reajuste} onValueChange={val=>handleChange('reajuste', val as any)} disabled={isFieldLocked('reajuste')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Sim">Sim</SelectItem>
              <SelectItem value="Não">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 space-y-1">
          <label className="text-sm font-medium flex items-center gap-1">
            Juros (%)
            {isFieldLocked('juros') && <Lock className="h-3 w-3 text-muted-foreground" />}
          </label>
          <Input
            type="number"
            value={state.juros}
            onChange={e=>handleChange('juros', Number(e.target.value))}
            disabled={isFieldLocked('juros') || state.reajuste !== 'Sim'}
          />
        </div>
      </div>

      {/* Entrada */}
      <div className="border-b">
        <div className="bg-zinc-100 dark:bg-zinc-900/40 px-4 py-1 text-sm font-semibold">ENTRADA</div>
        <div className="p-4 grid md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-sm flex items-center gap-1">
              Entrada?
              {isFieldLocked('entrada') && <Lock className="h-3 w-3 text-muted-foreground" />}
            </label>
            <Select value={state.entrada} onValueChange={val=>handleChange('entrada', val as any)} disabled={isFieldLocked('entrada')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm flex items-center gap-1">
              Valor
              {isPagamentoIndaia && !isCalculating && indaiaCalculation && valorMinimoOriginal > 0 && (
                <span className="text-xs text-blue-600">(mín: {valorMinimoOriginal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})})</span>
              )}
              {isSemJuros1mais4 && semJuros1mais4Calculation && (
                <span className="text-xs text-green-600">(20% fixo: {semJuros1mais4Calculation.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})})</span>
              )}
              {isAVistaDinheiro && aVistaDinheiroCalculation && (
                <span className="text-xs text-orange-600">(20% fixo: {aVistaDinheiroCalculation.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})})</span>
              )}
              {isAVistaParcialCartao && aVistaParcialCartaoCalculation && (
                <span className="text-xs text-purple-600">(20% fixo: {aVistaParcialCartaoCalculation.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})})</span>
              )}
              {isCondicaoEspecialConsultor && (
                <span className="text-xs text-teal-600">(mín R$ 1.000 - flexível)</span>
              )}
              {is5050 && pagamento5050Calculation && (
                <span className="text-xs text-amber-600">(20% fixo: {pagamento5050Calculation.valorEntrada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})})</span>
              )}
            </label>
            <Input
              type="number"
              value={state.valorEntrada === 0 ? '' : state.valorEntrada}
              onChange={e=>handleChange('valorEntrada', e.target.value)}
              disabled={state.entrada!=='Sim' || isFieldLocked('valorEntrada')}
              className={
                (isPagamentoIndaia && !isCalculating && valorMinimoOriginal > 0 && state.valorEntrada < valorMinimoOriginal) ||
                (isCondicaoEspecialConsultor && state.valorEntrada > 0 && state.valorEntrada < 1000)
                  ? 'border-yellow-400 bg-yellow-50' : ''
              }
            />
            {isPagamentoIndaia && !isCalculating && valorMinimoOriginal > 0 && state.valorEntrada > 0 && state.valorEntrada < valorMinimoOriginal && (
              <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                <strong>Atenção:</strong> Valor abaixo do mínimo recomendado para Pagamento Indaiá.
                <br />Mínimo: {valorMinimoOriginal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
              </div>
            )}
            {isCondicaoEspecialConsultor && state.valorEntrada > 0 && state.valorEntrada < 1000 && (
              <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                <strong>Atenção:</strong> Valor abaixo do mínimo exigido para Condição Especial do Consultor.
                <br />Mínimo: R$ 1.000,00
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm">Data</label>
            <Input type="date" value={state.dataEntrada} onChange={e=>handleChange('dataEntrada', e.target.value)} disabled={state.entrada!=='Sim'} />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Forma de Pag.</label>
            <Select value={state.formaPagamentoEntrada} onValueChange={val=>handleChange('formaPagamentoEntrada', val)} disabled={state.entrada!=='Sim'}>
              <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
              <SelectContent>
                {formaPgtoOptions.map(op=>(<SelectItem key={op} value={op}>{op}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm">Status Pagto</label>
            <Select value={state.statusPagamentoEntrada} onValueChange={val=>handleChange('statusPagamentoEntrada', val)} disabled={state.entrada!=='Sim'}>
              <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
              <SelectContent>
                {statusPgtoOptions.map(op=>(<SelectItem key={op} value={op}>{op}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Simulador */}
        <div className="px-4 pb-4 text-sm italic text-muted-foreground">{resumoSimulador()}</div>
      </div>

      {/* Parcelas */}
      <div className="border-b">
        <div className="bg-zinc-100 dark:bg-zinc-900/40 px-4 py-1 text-sm font-semibold">PARCELAS</div>
        <div className="p-4 grid md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-sm flex items-center gap-1">
              Qtd. Parcelas
              {isFieldLocked('qtdMeses') && <Lock className="h-3 w-3 text-muted-foreground" />}
              {isPagamentoIndaia && indaiaCalculation && !state.modoManual && (
                <span className="text-xs text-blue-600">({indaiaCalculation.quantidadeParcelas}x automático)</span>
              )}
            </label>
            <Select
              value={String(state.qtdMeses)}
              onValueChange={val=>handleChange('qtdMeses', Number(val))}
              disabled={isFieldLocked('qtdMeses')}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(() => {
                  // Para Pagamento Indaiá, usar o máximo de meses calculado
                  // Definir máximo de parcelas baseado no modelo
                  let maxParcelas = 30; // Padrão geral

                  if (isPagamentoIndaia && indaiaCalculation && !isCalculating) {
                    maxParcelas = Math.max(18, indaiaCalculation.quantidadeParcelas);
                  } else if (isAVistaParcialCartao) {
                    maxParcelas = 18; // Máximo de 18x para cartão de crédito
                  }

                  return Array.from({length: maxParcelas}, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm">Dia Vencimento</label>
            <Input type="number" value={state.diaVencimento} onChange={e=>handleChange('diaVencimento', Number(e.target.value))} />
          </div>
          {isPagamentoIndaia && indaiaCalculation && (
            <div className="col-span-2 space-y-1">
              <label className="text-sm text-blue-600">
                Valor da Parcela {state.modoManual ? '(Manual)' : '(Calculado)'}
              </label>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                {isCalculating ? (
                  <span className="text-orange-600 animate-pulse">Calculando...</span>
                ) : state.modoManual ? (
                  // Em modo manual, calcular dinamicamente
                  (() => {
                    const valorRestante = (state.valorTotalComJuros || totalProposta) - state.valorEntrada - (state.valorSaldoFinal || 0);
                    const valorParcela = state.qtdMeses > 0 ? Math.round((valorRestante / state.qtdMeses) * 100) / 100 : 0;
                    return valorParcela.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
                  })()
                ) : (
                  indaiaCalculation?.valorParcelas?.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) || 'R$ 0,00'
                )}
              </div>
            </div>
          )}
          {isSemJuros1mais4 && semJuros1mais4Calculation && (
            <div className="col-span-2 space-y-1">
              <label className="text-sm text-green-600">
                Valor das 4 Parcelas Fixas (Sem Juros)
              </label>
              <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                {semJuros1mais4Calculation.valorParcelas.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} cada
              </div>
            </div>
          )}
          {isAVistaDinheiro && aVistaDinheiroCalculation && (
            <div className="col-span-2 space-y-1">
              <label className="text-sm text-orange-600">
                Saldo À Vista (80% - Boleto)
              </label>
              <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                {aVistaDinheiroCalculation.valorSaldoFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} à vista
              </div>
            </div>
          )}
          {isAVistaParcialCartao && aVistaParcialCartaoCalculation && (
            <div className="col-span-2 space-y-1">
              <label className="text-sm text-purple-600">
                Parcelas do Cartão (Com Juros {aVistaParcialCartaoCalculation.percentualJuros.toFixed(2)}% a.m.)
              </label>
              <div className="p-2 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800">
                {aVistaParcialCartaoCalculation.quantidadeParcelasCartao}x de {aVistaParcialCartaoCalculation.valorParcelaCartao.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} • Pag. em até 30 dias
              </div>
            </div>
          )}
          {isCondicaoEspecialConsultor && condicaoEspecialConsultorCalculation && (
            <div className="col-span-2 space-y-1">
              <label className="text-sm text-teal-600">
                Parcelas Intermediárias (Mín R$ 600 cada)
              </label>
              <div className="p-2 bg-teal-50 border border-teal-200 rounded text-sm text-teal-800">
                {condicaoEspecialConsultorCalculation.parcelasIntermediarias}x de {condicaoEspecialConsultorCalculation.valorParcelaIntermediaria.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} • Até 30 dias antes do evento
              </div>
            </div>
          )}
          {is5050 && pagamento5050Calculation && (
            <div className="col-span-2 space-y-1">
              <label className="text-sm text-amber-600">
                Boleto Intermediário (30% em 30 dias)
              </label>
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                {pagamento5050Calculation.valorPrimeiroBoleto.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} • Venc: {pagamento5050Calculation.dataPrimeiroBoleto.toLocaleDateString('pt-BR')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saldo - Oculto para modelos específicos */}
      {!isSemJuros1mais4 && !isAVistaDinheiro && !isAVistaParcialCartao && (
      <div className="border-b">
        <div className="bg-zinc-100 dark:bg-zinc-900/40 px-4 py-1 text-sm font-semibold">SALDO</div>
        <div className="p-4 grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm flex items-center gap-1">
              Forma Pag. Saldo Final
              {isFieldLocked('formaSaldoFinal') && <Lock className="h-3 w-3 text-muted-foreground" />}
            </label>
            <Select value={state.formaSaldoFinal} onValueChange={val=>handleChange('formaSaldoFinal', val)} disabled={isFieldLocked('formaSaldoFinal')}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {formaSaldoFinalOptions.map(op => (
                  <SelectItem key={op} value={op}>{op}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isPagamentoIndaia && indaiaCalculation && (
            <div className="space-y-1">
              <label className="text-sm text-blue-600 flex items-center gap-1">
                Valor do Saldo Final (30% - 30 dias antes)
                {getDataSaldoFinal() && (
                  <span className="flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    Venc: {getDataSaldoFinal()?.toLocaleDateString('pt-BR')}
                  </span>
                )}
              </label>
              {state.modoManual ? (
                <Input
                  type="number"
                  value={state.valorSaldoFinal || ''}
                  onChange={(e) => handleChange('valorSaldoFinal', e.target.value)}
                  className="text-sm"
                  placeholder="Valor do saldo final"
                />
              ) : (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  {isCalculating ? (
                    <span className="text-orange-600 animate-pulse">Calculando...</span>
                  ) : (
                    indaiaCalculation?.valorSaldoFinal?.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) || 'R$ 0,00'
                  )}
                </div>
              )}
              {getDataSaldoFinal() && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data prevista de pagamento: <strong>{getDataSaldoFinal()?.toLocaleDateString('pt-BR')}</strong>
                </div>
              )}
            </div>
          )}
          {is5050 && pagamento5050Calculation && (
            <div className="space-y-1">
              <label className="text-sm text-amber-600 flex items-center gap-1">
                Saldo Final (50% + Juros {pagamento5050Calculation.percentualJuros.toFixed(2)}% a.m.)
                <span className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  Venc: {pagamento5050Calculation.dataSaldoFinal.toLocaleDateString('pt-BR')}
                </span>
              </label>
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                {pagamento5050Calculation.valorSaldoFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                <div className="text-xs text-amber-600 mt-1">
                  Valor base (50%): {(totalProposta * 0.5).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} +
                  Juros: {pagamento5050Calculation.jurosAplicados.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Pagamento 30 dias antes do evento • {Math.ceil((pagamento5050Calculation.dataSaldoFinal.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias para vencimento
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* OBS */}
      <div className="border-b">
        <div className="bg-zinc-100 dark:bg-zinc-900/40 px-4 py-1 text-sm font-semibold">OBS</div>
        <div className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm">Cláusulas Adicionais</label>
            <Textarea value={state.clausulas} onChange={e=>handleChange('clausulas', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Observação Financeiro</label>
            <Textarea value={state.observacao} onChange={e=>handleChange('observacao', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Negociação</label>
            <Select value={state.negociacao} onValueChange={val=>handleChange('negociacao', val)}>
              <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
              <SelectContent>
                {negociacaoOptions.map(op=>(<SelectItem key={op} value={op}>{op}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
