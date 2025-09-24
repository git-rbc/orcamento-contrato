import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComboboxSearch } from '@/components/ui/combobox-search';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { PropostaAlimentacao } from '@/components/propostas/proposta-alimentacao';
import { PropostaBebidas } from '@/components/propostas/proposta-bebidas';
import { PropostaServicos } from '@/components/propostas/proposta-servicos';
import { PropostaItensExtras } from '@/components/propostas/proposta-itens-extras';
import { PropostaResumo } from '@/components/propostas/proposta-resumo';
import { PropostaCondicoesPagamento } from '@/components/propostas/proposta-condicoes-pagamento';
import { buscarClientesParaSelect } from '@/services/clientes-client';
import { useEspacosEventos } from '@/hooks/useEspacosEventos';
import { EspacoEventoLayout, Produto } from '@/types/database';
import { DatePickerWithHolidays } from '@/components/ui/date-picker-with-holidays';
import { ServicoTemplate } from '@/types/database';
import { useCalculoServicos } from '@/hooks/useCalculoServicos';

// A interface SearchItem é necessária para a tipagem do ComboboxSearch
interface SearchItem {
  id?: string;
  nome?: string;
  cpf_cnpj?: string;
  valor_unitario?: number;
  categoria?: string;
  unidade_medida?: string;
}

export interface LinhaItem {
  id: string;
  produtoId: string | null;
  servicoTemplateId?: string | null;
  descricao: string;
  valorUnitario: number;
  quantidade: number;
  descontoPermitido: number;
  descontoAplicado: number;
  tipoItem: 'produto' | 'servico';
  tipoCalculo?: string;
  calculoAutomatico: boolean;
  parametrosCalculo?: Record<string, any>;
  cupomAplicado?: {
    id: string;
    codigo: string;
    nome: string;
    tipo_desconto: 'percentual' | 'valor_fixo';
    valor_desconto: number;
    valor_desconto_aplicado: number;
  } | null;
  // Campos para subprodutos
  subprodutos?: LinhaItem[];
  isSubproduto?: boolean;
  parentId?: string;
}


interface PropostaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propostaId?: string | null; // Se fornecido, edita a proposta existente
}

// Função para garantir que todos os itens tenham o campo subprodutos inicializado
const garantirSubprodutos = (items: LinhaItem[]): LinhaItem[] => {
  return items.map(item => ({
    ...item,
    subprodutos: item.subprodutos || [],
    // Garantir que subprodutos também tenham o campo inicializado recursivamente
    ...(item.subprodutos && item.subprodutos.length > 0 ? {
      subprodutos: garantirSubprodutos(item.subprodutos)
    } : {})
  }));
};

// Funções auxiliares para manipular subprodutos
const adicionarSubproduto = (items: LinhaItem[], parentId: string): LinhaItem[] => {
  return items.map(item => {
    if (item.id === parentId) {
      const novoSubproduto: LinhaItem = {
        id: crypto.randomUUID(),
        produtoId: null,
        servicoTemplateId: 'e3f4d5c6-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
        descricao: '',
        valorUnitario: 0,
        quantidade: 1,
        descontoPermitido: 0,
        descontoAplicado: 0,
        tipoItem: item.tipoItem,
        calculoAutomatico: false,
        isSubproduto: true,
        parentId: parentId,
        subprodutos: []
      };
      
      return {
        ...item,
        subprodutos: [...(item.subprodutos || []), novoSubproduto]
      };
    }
    return item;
  });
};

const removerSubproduto = (items: LinhaItem[], subprodutoId: string): LinhaItem[] => {
  return items.map(item => ({
    ...item,
    subprodutos: item.subprodutos?.filter(sub => sub.id !== subprodutoId) || []
  }));
};

const atualizarSubproduto = (items: LinhaItem[], subprodutoId: string, campo: keyof LinhaItem, valor: any): LinhaItem[] => {
  return items.map(item => ({
    ...item,
    subprodutos: item.subprodutos?.map(sub => 
      sub.id === subprodutoId ? { ...sub, [campo]: valor } : sub
    ) || []
  }));
};

const calcularTotalComSubprodutos = (item: LinhaItem): number => {
  // Calcular total do item principal
  const subtotalPrincipal = item.valorUnitario * item.quantidade;
  const descontoPrincipal = subtotalPrincipal * (item.descontoAplicado / 100);
  const totalPrincipal = subtotalPrincipal - descontoPrincipal;
  
  // Aplicar desconto do cupom no item principal
  let descontoCupomPrincipal = 0;
  if (item.cupomAplicado && totalPrincipal > 0) {
    if (item.cupomAplicado.tipo_desconto === 'percentual') {
      descontoCupomPrincipal = totalPrincipal * (item.cupomAplicado.valor_desconto / 100);
    } else {
      descontoCupomPrincipal = Math.min(item.cupomAplicado.valor_desconto, totalPrincipal);
    }
  }
  
  const totalPrincipalFinal = Math.max(0, totalPrincipal - descontoCupomPrincipal);
  
  // Calcular total dos subprodutos recursivamente
  const totalSubprodutos = (item.subprodutos || []).reduce((acc, subproduto) => {
    return acc + calcularTotalComSubprodutos(subproduto);
  }, 0);
  
  return totalPrincipalFinal + totalSubprodutos;
};

const obterTodosItensFlat = (items: LinhaItem[]): LinhaItem[] => {
  const resultado: LinhaItem[] = [];
  
  items.forEach(item => {
    resultado.push(item);
    if (item.subprodutos && item.subprodutos.length > 0) {
      resultado.push(...obterTodosItensFlat(item.subprodutos));
    }
  });
  
  return resultado;
};

export function PropostaModal({ open, onOpenChange, propostaId }: PropostaModalProps) {
  const [dataEvento, setDataEvento] = useState<Date | undefined>();
  const [dataContratacao, setDataContratacao] = useState<Date | undefined>();
  const [diaSemana, setDiaSemana] = useState<string>('');
  const [validoPara, setValidoPara] = useState<string>('');
  const [clienteId, setClienteId] = useState<string>('');
  const [espacoId, setEspacoId] = useState<string>('');
  const [layoutId, setLayoutId] = useState<string>('');
  const [layouts, setLayouts] = useState<EspacoEventoLayout[]>([]);
  const [numPessoas, setNumPessoas] = useState<number | string>('');
  const [tipoEvento, setTipoEvento] = useState<string>('');
  const [capacidadeMaxima, setCapacidadeMaxima] = useState<number | null>(null);
  const { espacos } = useEspacosEventos();

  // States for Cliente Combobox
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteItems, setClienteItems] = useState<SearchItem[]>([]);
  const [clienteLoading, setClienteLoading] = useState(false);


  // Centralized state for all proposal items
  const [alimentacaoItens, setAlimentacaoItens] = useState<LinhaItem[]>([{ 
    id: crypto.randomUUID(), 
    produtoId: null, 
    descricao: '', 
    valorUnitario: 0, 
    quantidade: 1, 
    descontoPermitido: 0, 
    descontoAplicado: 0, 
    tipoItem: 'produto', 
    calculoAutomatico: false,
    subprodutos: []
  }]);
  const [bebidasItens, setBebidasItens] = useState<LinhaItem[]>([{ 
    id: crypto.randomUUID(), 
    produtoId: null, 
    descricao: '', 
    valorUnitario: 0, 
    quantidade: 1, 
    descontoPermitido: 0, 
    descontoAplicado: 0, 
    tipoItem: 'produto', 
    calculoAutomatico: false,
    subprodutos: []
  }]);
  const [servicosItens, setServicosItens] = useState<LinhaItem[]>([{ 
    id: crypto.randomUUID(), 
    produtoId: null, 
    descricao: '', 
    valorUnitario: 0, 
    quantidade: 1, 
    descontoPermitido: 0, 
    descontoAplicado: 0, 
    tipoItem: 'servico', 
    calculoAutomatico: false 
  }]);
  const [itensExtras, setItensExtras] = useState<LinhaItem[]>([{ 
    id: crypto.randomUUID(), 
    produtoId: null, 
    descricao: '', 
    valorUnitario: 0, 
    quantidade: 1, 
    descontoPermitido: 0, 
    descontoAplicado: 0, 
    tipoItem: 'produto', 
    calculoAutomatico: false,
    subprodutos: []
  }]);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [totalProposta, setTotalProposta] = useState(0);
  const [totalBruto, setTotalBruto] = useState(0); // Total antes de descontos e entrada
  const [valorDesconto, setValorDesconto] = useState(0);
  
  // Estado para condições de pagamento
  const [condicoesPagamento, setCondicoesPagamento] = useState({
    modeloPagamento: 'Pagamento Indaiá',
    reajuste: 'Não' as 'Sim' | 'Não',
    juros: 0,
    valorEntrada: 0,
    dataEntrada: '',
    formaPagamentoEntrada: '',
    statusPagamentoEntrada: '',
    qtdMeses: 1,
    diaVencimento: 5,
    formaSaldoFinal: '',
    clausulas: '',
    observacao: '',
    entrada: 'Não' as 'Sim' | 'Não',
    negociacao: '',
  });

  // Hook para cálculo automático dos serviços
  const { recalcularServicos, verificarDadosDisponiveis, calculandoServicos, errosCalculo } = useCalculoServicos({
    servicosItens,
    alimentacaoItens,
    bebidasItens,
    itensExtras,
    espacoId,
    diaSemana,
    numPessoas: typeof numPessoas === 'number' ? numPessoas : undefined,
    dataContratacao,
    dataRealizacao: dataEvento
  });

  // Estados para verificar feriados
  const [holidays, setHolidays] = useState<{date: string, name: string}[]>([]);

  // Carregar feriados
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch('/api/feriados');
        if (response.ok) {
          const data = await response.json();
          setHolidays(data);
        }
      } catch (error) {
        console.error('Erro ao carregar feriados:', error);
      }
    };
    fetchHolidays();
  }, []);

  // Função para determinar automaticamente o "Válido para"
  const determinarValidoPara = (data: Date | undefined, diaDaSemana: string) => {
    if (!data) return '';

    const dataFormatada = data.toISOString().split('T')[0];
    
    // Verificar se é feriado
    const isFeriado = holidays.some(holiday => holiday.date === dataFormatada);
    
    // Verificar se é véspera de feriado
    const proximoDia = new Date(data);
    proximoDia.setDate(proximoDia.getDate() + 1);
    const proximoDiaFormatado = proximoDia.toISOString().split('T')[0];
    const isVespera = holidays.some(holiday => holiday.date === proximoDiaFormatado);

    // Lógica de determinação
    if (diaDaSemana === 'Sábado' || isFeriado || isVespera) {
      return 'SÁBADO, VÉSPERAS E FERIADOS';
    } else if (diaDaSemana === 'Domingo') {
      return 'De Domingo à Sexta-feira';
    } else if (['Segunda', 'Terça', 'Quarta', 'Quinta'].includes(diaDaSemana)) {
      return 'De Segunda-feira à Quinta-feira';
    } else if (diaDaSemana === 'Sexta') {
      return 'De Domingo à Sexta-feira';
    }
    
    return '';
  };

  // Função para carregar e popular todos os serviços template
  const carregarServicosTemplate = async () => {
    try {
      const response = await fetch('/api/servicos-template');
      if (response.ok) {
        const data = await response.json();
        const servicos: ServicoTemplate[] = data.data || [];
        
        // Converter serviços template para LinhaItem
        const servicosLinhaItem: LinhaItem[] = servicos
          .filter(servico => servico.ativo)
          .map(servico => ({
            id: crypto.randomUUID(),
            produtoId: null,
            servicoTemplateId: servico.id,
            descricao: servico.nome,
            valorUnitario: 0, // Será calculado dinamicamente
            quantidade: 1,
            descontoPermitido: 0,
            descontoAplicado: 0,
            tipoItem: 'servico' as const,
            tipoCalculo: servico.tipo_calculo,
            calculoAutomatico: true,
            parametrosCalculo: {}
          }));

        // Sempre adicionar item de decoração após todos os serviços
        const itemDecoracao: LinhaItem = {
          id: crypto.randomUUID(),
          produtoId: null,
          servicoTemplateId: 'e3f4d5c6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', // Serviço genérico para produtos
          descricao: 'Selecione a decoração clicando aqui',
          valorUnitario: 0,
          quantidade: 1,
          descontoPermitido: 0,
          descontoAplicado: 0,
          tipoItem: 'produto' as const,
          calculoAutomatico: false,
          parametrosCalculo: {}
        };

        setServicosItens([...servicosLinhaItem, itemDecoracao]);
      }
    } catch (error) {
      console.error('Erro ao carregar serviços template:', error);
    }
  };

  // useEffect for fetching clientes
  useEffect(() => {
    const fetchClientes = async () => {
      if (clienteSearch.length < 1) { 
        setClienteItems([]);
        return;
      }
      setClienteLoading(true);
      try {
        const results = await buscarClientesParaSelect(clienteSearch);
        setClienteItems(results);
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        setClienteItems([]);
      } finally {
        setClienteLoading(false);
      }
    };
    
    const debounce = setTimeout(() => {
        fetchClientes();
    }, 300); 

    return () => clearTimeout(debounce);
  }, [clienteSearch]);

  // Carregar dados da proposta se estiver editando
  useEffect(() => {
    const carregarDadosProposta = async () => {
      if (propostaId) {
        try {
          console.log('Carregando proposta:', propostaId);
          const response = await fetch(`/api/propostas/${propostaId}`);
          console.log('Response status:', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('Dados carregados:', result);
            const proposta = result.data;
            
            if (!proposta) {
              console.error('Proposta não encontrada nos dados retornados');
              return;
            }
            
            // Preencher campos básicos
            setClienteId(proposta.cliente_id || '');

            // Carregar cliente nos items do ComboboxSearch se existe
            if (proposta.cliente) {
              const clienteItem: SearchItem = {
                id: proposta.cliente.id,
                nome: proposta.cliente.nome,
                cpf_cnpj: proposta.cliente.cpf_cnpj,
                valor_unitario: 0,
                categoria: '',
                unidade_medida: ''
              };
              setClienteItems([clienteItem]);
            }

            setDataEvento(proposta.data_realizacao ? new Date(proposta.data_realizacao) : undefined);
            setDataContratacao(proposta.data_contratacao ? new Date(proposta.data_contratacao) : undefined);
            setDiaSemana(proposta.dia_semana || '');
            setEspacoId(proposta.espaco_id || '');
            setLayoutId(proposta.layout_id || '');
            setNumPessoas(proposta.num_pessoas || '');
            setTipoEvento(proposta.tipo_evento || '');
            
            // Preencher itens com fallback para arrays vazios se não houver dados
            setAlimentacaoItens(proposta.itens_alimentacao && proposta.itens_alimentacao.length > 0 ? 
              garantirSubprodutos(proposta.itens_alimentacao) : [{
              id: crypto.randomUUID(),
              produtoId: null,
              descricao: '',
              valorUnitario: 0,
              quantidade: 1,
              descontoPermitido: 0,
              descontoAplicado: 0,
              tipoItem: 'produto',
              calculoAutomatico: false,
              subprodutos: []
            }]);
            
            setBebidasItens(proposta.itens_bebidas && proposta.itens_bebidas.length > 0 ? 
              garantirSubprodutos(proposta.itens_bebidas) : [{
              id: crypto.randomUUID(),
              produtoId: null,
              descricao: '',
              valorUnitario: 0,
              quantidade: 1,
              descontoPermitido: 0,
              descontoAplicado: 0,
              tipoItem: 'produto',
              calculoAutomatico: false,
              subprodutos: []
            }]);
            
            setServicosItens(proposta.itens_servicos && proposta.itens_servicos.length > 0 ? 
              garantirSubprodutos(proposta.itens_servicos) : [{
              id: crypto.randomUUID(),
              produtoId: null,
              descricao: '',
              valorUnitario: 0,
              quantidade: 1,
              descontoPermitido: 0,
              descontoAplicado: 0,
              tipoItem: 'servico',
              calculoAutomatico: false,
              subprodutos: []
            }]);
            
            setItensExtras(proposta.itens_extras && proposta.itens_extras.length > 0 ? 
              garantirSubprodutos(proposta.itens_extras) : [{
              id: crypto.randomUUID(),
              produtoId: null,
              descricao: '',
              valorUnitario: 0,
              quantidade: 1,
              descontoPermitido: 0,
              descontoAplicado: 0,
              tipoItem: 'produto',
              calculoAutomatico: false,
              subprodutos: []
            }]);
            
            
            // Preencher valores
            setValorEntrada(proposta.valor_entrada || 0);
            setValorDesconto(proposta.valor_desconto || 0);
            
            // Preencher condições de pagamento
            setCondicoesPagamento({
              modeloPagamento: proposta.modelo_pagamento || 'Pagamento Indaiá',
              reajuste: proposta.reajuste || 'Não',
              juros: proposta.juros || 0,
              valorEntrada: proposta.valor_entrada || 0,
              dataEntrada: proposta.data_entrada || '',
              formaPagamentoEntrada: proposta.forma_pagamento_entrada || '',
              statusPagamentoEntrada: proposta.status_pagamento_entrada || '',
              qtdMeses: proposta.qtd_meses || 1,
              diaVencimento: proposta.dia_vencimento || 5,
              formaSaldoFinal: proposta.forma_saldo_final || '',
              clausulas: proposta.clausulas_adicionais || '',
              observacao: proposta.observacao_financeiro || '',
              entrada: proposta.entrada || 'Não',
              negociacao: proposta.negociacao || '',
            });
            
            // Carregar layouts se necessário, preservando os campos já carregados
            if (proposta.espaco_id) {
              await handleEspacoChange(proposta.espaco_id, true);
            }
            
            console.log('Proposta carregada com sucesso');
          } else {
            const errorData = await response.json();
            console.error('Erro ao carregar proposta:', response.status, errorData);
          }
        } catch (error) {
          console.error('Erro ao carregar dados da proposta:', error);
        }
      }
    };

    if (open) {
      if (propostaId) {
        carregarDadosProposta();
      } else {
        // Limpar campos quando criar nova proposta
        setDataEvento(undefined);
        setDataContratacao(new Date()); // Sempre usar data atual
        setDiaSemana('');
        setValidoPara('');
        setClienteId('');
        setEspacoId('');
        setLayoutId('');
        setNumPessoas('');
        setTipoEvento('');
        setCapacidadeMaxima(null);
        
        // Resetar itens para valores padrão
        setAlimentacaoItens([{ 
          id: crypto.randomUUID(), 
          produtoId: null, 
          descricao: '', 
          valorUnitario: 0, 
          quantidade: 1, 
          descontoPermitido: 0, 
          descontoAplicado: 0, 
          tipoItem: 'produto', 
          calculoAutomatico: false,
          subprodutos: []
        }]);
        setBebidasItens([{ 
          id: crypto.randomUUID(), 
          produtoId: null, 
          descricao: '', 
          valorUnitario: 0, 
          quantidade: 1, 
          descontoPermitido: 0, 
          descontoAplicado: 0, 
          tipoItem: 'produto', 
          calculoAutomatico: false,
          subprodutos: []
        }]);
        
        setItensExtras([{ 
          id: crypto.randomUUID(), 
          produtoId: null, 
          descricao: '', 
          valorUnitario: 0, 
          quantidade: 1, 
          descontoPermitido: 0, 
          descontoAplicado: 0, 
          tipoItem: 'produto', 
          calculoAutomatico: false,
          subprodutos: []
        }]);
        
        setValorEntrada(0);
        setValorDesconto(0);
        
        // Resetar condições de pagamento
        setCondicoesPagamento({
          modeloPagamento: 'Pagamento Indaiá',
          reajuste: 'Não',
          juros: 0,
          valorEntrada: 0,
          dataEntrada: '',
          formaPagamentoEntrada: '',
          statusPagamentoEntrada: '',
          qtdMeses: 1,
          diaVencimento: 5,
          formaSaldoFinal: '',
          clausulas: '',
          observacao: '',
          entrada: 'Não',
          negociacao: '',
        });
      }
      
      // Aguardar um pouco antes de carregar serviços após mudanças de ordem
      setTimeout(() => {
        carregarServicosTemplate();
      }, 200);
    }
  }, [open, propostaId]);

  // Carregar serviços template quando o modal abrir (removido pois foi integrado acima)
  // useEffect(() => {
  //   if (open) {
  //     carregarServicosTemplate();
  //   }
  // }, [open]);

  // Garantir que sempre há um campo de decoração
  useEffect(() => {
    if (open && servicosItens.length > 0) {
      const temDecoracao = servicosItens.some(item => 
        item.descricao === 'Selecione a decoração clicando aqui' || 
        item.descricao.toLowerCase().includes('decoração') ||
        item.descricao.toLowerCase().includes('decoracao')
      );

      if (!temDecoracao) {
        const itemDecoracao: LinhaItem = {
          id: crypto.randomUUID(),
          produtoId: null,
          descricao: 'Selecione a decoração clicando aqui',
          valorUnitario: 0,
          quantidade: 1,
          descontoPermitido: 0,
          descontoAplicado: 0,
          tipoItem: 'produto' as const,
          calculoAutomatico: false,
          parametrosCalculo: {}
        };
        setServicosItens([...servicosItens, itemDecoracao]);
      }
    }
  }, [open, servicosItens]);

  // Definir automaticamente a data de contratação como data atual
  useEffect(() => {
    if (open) {
      setDataContratacao(new Date());
    }
  }, [open]);

  // Atualizar automaticamente o campo "Válido para"
  useEffect(() => {
    if (dataEvento && diaSemana && holidays.length > 0) {
      const validoParaAutomatico = determinarValidoPara(dataEvento, diaSemana);
      if (validoParaAutomatico) {
        setValidoPara(validoParaAutomatico);
      }
    }
  }, [dataEvento, diaSemana, holidays]);

  // Recalcular serviços quando dados relevantes mudarem
  useEffect(() => {
    if (open && servicosItens.length > 0) {
      const timer = setTimeout(() => {
        recalcularServicos(setServicosItens);
      }, 1500); // Aumentado para 1.5s para dar tempo da API estabilizar após mudanças de ordem

      return () => clearTimeout(timer);
    }
  }, [espacoId, diaSemana, numPessoas, alimentacaoItens, bebidasItens, itensExtras, open, dataContratacao, dataEvento]);



  useEffect(() => {
    const calculateSubtotal = (items: LinhaItem[]) =>
      items.reduce((acc, item) => acc + calcularTotalComSubprodutos(item), 0);

    const totalAlimentacao = calculateSubtotal(alimentacaoItens);
    const totalBebidas = calculateSubtotal(bebidasItens);
    const totalServicos = calculateSubtotal(servicosItens);
    const totalItensExtras = calculateSubtotal(itensExtras);

    const subTotal = totalAlimentacao + totalBebidas + totalServicos + totalItensExtras;
    setTotalBruto(subTotal);

    const totalComDesconto = Math.max(0, subTotal - valorDesconto);
    const entradaValidada = Math.min(valorEntrada, totalComDesconto);
    const totalFinal = Math.max(0, totalComDesconto - entradaValidada);

    setTotalProposta(totalFinal);
  }, [alimentacaoItens, bebidasItens, servicosItens, itensExtras, valorEntrada, valorDesconto]);

  const handleDescontoChange = (desconto: number) => {
    setValorDesconto(desconto);
  };

  const totalParaPagamento = useMemo(() => {
    return Math.max(0, totalBruto - valorDesconto);
  }, [totalBruto, valorDesconto]);

  const handleItemCupomChange = (itemId: string, cupom: any) => {
    // Função helper para atualizar item em uma lista (incluindo subprodutos)
    const updateItemInList = (items: LinhaItem[], cupom: any): LinhaItem[] => {
      return items.map(item => {
        // Verificar se o item principal é o alvo
        if (item.id === itemId) {
          if (cupom && item.cupomAplicado && item.cupomAplicado.id === cupom.id) {
            return item;
          }
          return { ...item, cupomAplicado: cupom };
        }
        
        // Verificar subprodutos
        if (item.subprodutos && item.subprodutos.length > 0) {
          const subprodutosAtualizados = item.subprodutos.map(sub => {
            if (sub.id === itemId) {
              if (cupom && sub.cupomAplicado && sub.cupomAplicado.id === cupom.id) {
                return sub;
              }
              return { ...sub, cupomAplicado: cupom };
            }
            return sub;
          });
          
          return { ...item, subprodutos: subprodutosAtualizados };
        }
        
        return item;
      });
    };

    // Verificar se o cupom já está sendo usado em outro item (incluindo subprodutos)
    if (cupom) {
      const todosItensFlat = [
        ...obterTodosItensFlat(alimentacaoItens),
        ...obterTodosItensFlat(bebidasItens),
        ...obterTodosItensFlat(servicosItens),
        ...obterTodosItensFlat(itensExtras)
      ];
      
      const cupomJaUsado = todosItensFlat.some(item => 
        item.id !== itemId && item.cupomAplicado?.id === cupom.id
      );
      
      if (cupomJaUsado) {
        console.warn('Cupom já está sendo usado em outro item');
        return;
      }
    }

    // Atualizar o item na lista apropriada
    setAlimentacaoItens(prev => updateItemInList(prev, cupom));
    setBebidasItens(prev => updateItemInList(prev, cupom));
    setServicosItens(prev => updateItemInList(prev, cupom));
    setItensExtras(prev => updateItemInList(prev, cupom));
  };

  const handleEspacoChange = async (id: string, preserveFields: boolean = false) => {
    setEspacoId(id);
    
    // Só resetar campos se não for para preservar (mudança manual do usuário)
    if (!preserveFields) {
      setLayoutId('');
      setNumPessoas('');
    }
    
    setLayouts([]);
    
    // Definir capacidade máxima baseada no espaço selecionado
    if (id) {
      const espacoSelecionado = espacos.find(espaco => espaco.id === id);
      if (espacoSelecionado) {
        setCapacidadeMaxima(espacoSelecionado.capacidade_maxima);
      }
      
      try {
        const response = await fetch(`/api/espacos-eventos/${id}/layouts`);
        if (response.ok) {
          const data = await response.json();
          setLayouts(Array.isArray(data) ? data : data.data || []);
        } else {
          console.error('Failed to fetch layouts');
          setLayouts([]);
        }
      } catch (error) {
        console.error('Error fetching layouts:', error);
        setLayouts([]);
      }
    } else {
      setCapacidadeMaxima(null);
    }
  };

  const handleLayoutChange = (selectedLayoutId: string) => {
    setLayoutId(selectedLayoutId);
    setNumPessoas('');
    
    // Definir capacidade máxima baseada no layout selecionado
    if (selectedLayoutId) {
      const layoutSelecionado = layouts.find(layout => layout.id === selectedLayoutId);
      if (layoutSelecionado) {
        setCapacidadeMaxima(layoutSelecionado.capacidade);
      }
    } else {
      // Se nenhum layout está selecionado, usar a capacidade do espaço
      if (espacoId) {
        const espacoSelecionado = espacos.find(espaco => espaco.id === espacoId);
        if (espacoSelecionado) {
          setCapacidadeMaxima(espacoSelecionado.capacidade_maxima);
        }
      }
    }
  };

  // Função auxiliar para atualizar quantidade de produtos (exceto serviços)
  const atualizarQuantidadeProdutos = (items: LinhaItem[], quantidade: number): LinhaItem[] => {
    return items.map(item => {
      // Atualizar apenas produtos, não serviços
      const itemAtualizado = item.tipoItem === 'produto' 
        ? { ...item, quantidade } 
        : item;
      
      // Atualizar subprodutos recursivamente se existirem
      if (itemAtualizado.subprodutos && itemAtualizado.subprodutos.length > 0) {
        itemAtualizado.subprodutos = atualizarQuantidadeProdutos(itemAtualizado.subprodutos, quantidade);
      }
      
      return itemAtualizado;
    });
  };
  const handleNumPessoasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setNumPessoas('');
      return;
    }

    const numericValue = parseInt(value, 10);
    let finalValue = numericValue;

    if (capacidadeMaxima !== null && numericValue > capacidadeMaxima) {
      finalValue = capacidadeMaxima;
    }

    setNumPessoas(finalValue);

    // Sincronizar quantidades dos produtos com o número de pessoas
    // Atualizar apenas se há um valor válido
    if (finalValue > 0) {
      setAlimentacaoItens(prev => atualizarQuantidadeProdutos(prev, finalValue));
      setBebidasItens(prev => atualizarQuantidadeProdutos(prev, finalValue));
      setItensExtras(prev => atualizarQuantidadeProdutos(prev, finalValue));
      // Nota: servicosItens NÃO é atualizado pois contém serviços, não produtos
    }
  };;

  const handleClienteSelect = (item: SearchItem | null) => {
    setClienteId(item?.id || '');
    // Limpar erros se cliente foi selecionado
    if (item && errosValidacao.length > 0) {
      setErrosValidacao(prev => prev.filter(erro => !erro.includes('Cliente é obrigatório')));
    }
  };

  // Validações
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);

  // Limpar erros quando valores relevantes mudarem
  useEffect(() => {
    if (errosValidacao.length > 0) {
      const novosErros = errosValidacao.filter(erro => {
        // Limpar erro de espaço se foi selecionado
        if (erro.includes('Espaço é obrigatório') && espacoId) return false;
        
        // Limpar erro de data se foi preenchida
        if (erro.includes('Data de realização é obrigatória') && dataEvento) return false;
        
        // Limpar erro de número de pessoas se foi preenchido
        if (erro.includes('Número de pessoas deve ser informado') && numPessoas && parseInt(numPessoas as string) > 0) return false;
        
        // Limpar erro de capacidade se foi corrigido
        if (erro.includes('excede a capacidade máxima') && numPessoas && capacidadeMaxima && parseInt(numPessoas as string) <= capacidadeMaxima) return false;
        
        // Validação de datas removida - não há mais erro relacionado
        
        // Limpar erro de total se foi corrigido
        if (erro.includes('Total da proposta deve ser maior que zero') && totalProposta > 0) return false;
        
        return true;
      });
      
      if (novosErros.length !== errosValidacao.length) {
        setErrosValidacao(novosErros);
      }
    }
  }, [espacoId, dataEvento, numPessoas, capacidadeMaxima, dataContratacao, totalProposta, errosValidacao]);

  // Garantir que todos os itens tenham campo subprodutos inicializado quando modal abrir
  useEffect(() => {
    if (open && !propostaId) {
      // Aplicar apenas quando não há proposta sendo carregada (nova proposta)
      setAlimentacaoItens(prev => garantirSubprodutos(prev));
      setBebidasItens(prev => garantirSubprodutos(prev));
      setItensExtras(prev => garantirSubprodutos(prev));
    }
  }, [open, propostaId]);

  const validarProposta = (): boolean => {
    const erros: string[] = [];

    // Validar campos obrigatórios
    if (!clienteId) {
      erros.push('Cliente é obrigatório');
    }

    if (!espacoId) {
      erros.push('Espaço é obrigatório');
    }

    if (!dataEvento) {
      erros.push('Data de realização é obrigatória');
    }

    if (!numPessoas || (typeof numPessoas === 'number' && numPessoas <= 0) || (typeof numPessoas === 'string' && parseInt(numPessoas) <= 0)) {
      erros.push('Número de pessoas deve ser informado e maior que zero');
    }

    // Validação de datas removida - data de contratação é sempre atual
    // A validação anterior estava verificando se dataContratacao < dataEvento
    // Como agora sempre usamos data atual, essa validação não é mais necessária

    // Validar capacidade
    if (espacoId && numPessoas && capacidadeMaxima) {
      if (typeof numPessoas === 'number' && numPessoas > capacidadeMaxima) {
        erros.push(`Número de pessoas (${numPessoas}) excede a capacidade máxima do espaço (${capacidadeMaxima})`);
      }
    }

    // Validar se há pelo menos um item com valor (incluindo subprodutos)
    const todosItensFlat = [
      ...obterTodosItensFlat(alimentacaoItens),
      ...obterTodosItensFlat(bebidasItens),
      ...obterTodosItensFlat(servicosItens),
      ...obterTodosItensFlat(itensExtras)
    ];
    const itensComValor = todosItensFlat.filter(item => 
      item.valorUnitario > 0 && item.quantidade > 0
    );

    if (itensComValor.length === 0) {
      erros.push('Deve haver pelo menos um item com valor na proposta');
    }

    // Validar total da proposta
    if (totalProposta <= 0) {
      erros.push('Total da proposta deve ser maior que zero');
    }

    setErrosValidacao(erros);
    return erros.length === 0;
  };

  const handleSalvarProposta = async () => {
    if (!validarProposta()) {
      return;
    }

    try {
      const propostaData = {
        codigoReuniao: '', // Pode ser preenchido quando implementar
        clienteId,
        dataContratacao: dataContratacao ? dataContratacao.toISOString().split('T')[0] : undefined,
        dataRealizacao: dataEvento ? dataEvento.toISOString().split('T')[0] : undefined,
        diaSemana,
        espacoId,
        layoutId,
        numPessoas: typeof numPessoas === 'number' ? numPessoas : undefined,
        tipoEvento,
        alimentacaoItens,
        bebidasItens,
        servicosItens,
        itensExtras,
        totalProposta,
        valorDesconto,
        valorEntrada,
        condicoesPagamento
      };

      const url = propostaId ? `/api/propostas/${propostaId}` : '/api/propostas';
      const method = propostaId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propostaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ao ${propostaId ? 'atualizar' : 'salvar'} proposta`);
      }

      const result = await response.json();
      console.log(`Proposta ${propostaId ? 'atualizada' : 'salva'} com sucesso:`, result);
      
      // Fechar modal após salvar
      onOpenChange(false);
      
      // Aqui pode adicionar toast de sucesso
      
    } catch (error) {
      console.error(`Erro ao ${propostaId ? 'atualizar' : 'salvar'} proposta:`, error);
      setErrosValidacao([`Erro ao ${propostaId ? 'atualizar' : 'salvar'} proposta. Tente novamente.`]);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">
          {propostaId ? 'Editar Proposta' : 'Nova Proposta'}
        </DialogTitle>
        {/* Cabeçalho da Proposta */}
        <div className="border rounded shadow-sm bg-white dark:bg-card">
          {/* Faixa superior com logo */}
          <div className="bg-zinc-800 py-4 flex items-center justify-center relative">
            <Image 
              src="/logos/LOGO BRANCA FUNDO TRANSP.png" 
              alt="Logo" 
              width={160} 
              height={60} 
            />
          </div>

          {/* Formulário do cabeçalho */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* Coluna esquerda */}
            <div className="space-y-4">
              <div className="grid grid-cols-5 items-center gap-2">
                <label className="col-span-2 font-medium" htmlFor="codReuniao">Cód Reunião:</label>
                <Input id="codReuniao" className="col-span-3" placeholder="P80215" />
              </div>

              <div className="grid grid-cols-5 items-center gap-2">
                <label className="col-span-2 font-medium" htmlFor="cliente">Cliente:</label>
                <div className="col-span-3">
                  <ComboboxSearch
                    placeholder="Selecione um cliente..."
                    searchPlaceholder="Digite para buscar cliente..."
                    emptyText="Nenhum cliente encontrado."
                    value={clienteId}
                    onSelect={handleClienteSelect}
                    items={clienteItems}
                    loading={clienteLoading}
                    inputValue={clienteSearch}
                    onInputChange={setClienteSearch}
                  />
                </div>
              </div>

              {/* Campo oculto - Data de Contratação sempre usa data atual
              <div className="grid grid-cols-5 items-center gap-2">
                <label className="col-span-2 font-medium" htmlFor="dataContratacao">Data Contrat.:</label>
                <div className="col-span-3">
                  <DatePickerWithHolidays
                    date={dataContratacao}
                    setDate={setDataContratacao}
                  />
                </div>
              </div>
              */}

              <div className="grid grid-cols-5 items-center gap-2">
                <label className="col-span-2 font-medium" htmlFor="dataRealiz">Data Realiz.:</label>
                <div className="col-span-3">
                  <DatePickerWithHolidays
                    date={dataEvento}
                    setDate={(date) => {
                      setDataEvento(date);
                      if (date) {
                        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                        const diaDaSemana = diasSemana[date.getDay()];
                        setDiaSemana(diaDaSemana);
                      } else {
                        setDiaSemana('');
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 items-center gap-2">
                <label className="col-span-2 font-medium" htmlFor="diaSemana">Dia da Sem:</label>
                <Select value={diaSemana} onValueChange={setDiaSemana} disabled={!!dataEvento}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map(d => (
                      <SelectItem value={d} key={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-5 items-center gap-2">
                <label className="col-span-2 font-medium" htmlFor="validoPara">Válido para:</label>
                <Select value={validoPara} onValueChange={setValidoPara} disabled={!!dataEvento}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {['SÁBADO, VÉSPERAS E FERIADOS','De Domingo à Sexta-feira','De Segunda-feira à Quinta-feira'].map(d => (
                      <SelectItem value={d} key={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Coluna direita */}
            <div className="space-y-4">
              <div className="grid grid-cols-5 items-center gap-2">
                <label className="col-span-2 font-medium" htmlFor="espaco">Espaço:</label>
                <Select onValueChange={handleEspacoChange} value={espacoId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {espacos.map(op => (
                      <SelectItem value={op.id} key={op.id}>
                        {op.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-5 items-center gap-2">
                <label className="col-span-2 font-medium" htmlFor="layout">Layout:</label>
                <Select onValueChange={handleLayoutChange} value={layoutId} disabled={!espacoId || layouts.length === 0}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={!espacoId ? "Selecione um espaço" : "Selecione um layout"} />
                  </SelectTrigger>
                  <SelectContent>
                    {layouts.map(op => (
                      <SelectItem value={op.id} key={op.id}>
                        {op.layout}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-5 items-center gap-2">
                <label className="col-span-2 font-medium" htmlFor="numPessoas">Nº de Pessoas:</label>
                <Input 
                  id="numPessoas" 
                  className="col-span-3" 
                  type="number" 
                  placeholder={capacidadeMaxima ? `Máx: ${capacidadeMaxima}` : layoutId ? "Selecione um layout" : "Selecione um espaço"}
                  value={numPessoas}
                  onChange={handleNumPessoasChange}
                  disabled={!espacoId}
                  max={capacidadeMaxima ?? undefined}
                />
              </div>


              <div className="grid grid-cols-5 items-center gap-2">
                <label className="col-span-2 font-medium" htmlFor="tipoEvento">Tipo de Evento:</label>
                <Select value={tipoEvento} onValueChange={setTipoEvento}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Casamento','15 Anos','Elopement','Dinner'].map(op => (
                      <SelectItem value={op} key={op}>{op}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>


          {/* Seção Alimentação */}
          <div className="px-6 pb-6">
            <PropostaAlimentacao
              items={alimentacaoItens}
              setItems={setAlimentacaoItens}
              titulo="Alimentação"
              numPessoas={typeof numPessoas === 'number' ? numPessoas : undefined}
            />
          </div>

          {/* Seção Bebidas */}
          <div className="px-6 pb-6">
            <PropostaBebidas
              items={bebidasItens}
              setItems={setBebidasItens}
              titulo="Bebidas"
              numPessoas={typeof numPessoas === 'number' ? numPessoas : undefined}
            />
          </div>

          {/* Seção Serviços */}
          <div className="px-6 pb-6">
            <PropostaServicos 
              items={servicosItens} 
              setItems={setServicosItens} 
              titulo="Serviços" 
              espacoId={espacoId}
              diaSemana={diaSemana}
              numPessoas={typeof numPessoas === 'number' ? numPessoas : undefined}
            />
          </div>

          {/* Seção Itens Extras */}
          <div className="px-6 pb-6">
            <PropostaItensExtras items={itensExtras} setItems={setItensExtras} titulo="Itens Extras" numPessoas={typeof numPessoas === 'number' ? numPessoas : undefined} />
          </div>

          {/* Resumo e Cupom */}
          <div className="px-6 pb-6">
            <PropostaResumo
              totalProposta={totalBruto}
              totalLiquido={totalProposta}
              valorEntrada={valorEntrada}
              clienteId={clienteId}
              onDescontoChange={handleDescontoChange}
              itensDisponiveis={[
                { categoria: 'Alimentação', itens: alimentacaoItens },
                { categoria: 'Bebidas', itens: bebidasItens },
                { categoria: 'Serviços', itens: servicosItens },
                { categoria: 'Itens Extras', itens: itensExtras }
              ].filter(categoria => categoria.itens.length > 0)}
              onItemCupomChange={handleItemCupomChange}
            />
          </div>

          {/* Condições de Pagamento */}
          <div className="px-6 pb-6">
            <PropostaCondicoesPagamento
              totalProposta={totalParaPagamento}
              onValorEntradaChange={setValorEntrada}
              onCondicoesPagamentoChange={setCondicoesPagamento}
              initialValues={condicoesPagamento}
              dataEvento={dataEvento}
            />
          </div>

          {/* Erros de validação */}
          {errosValidacao.length > 0 && (
            <div className="px-6 pb-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Corrija os seguintes erros:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {errosValidacao.map((erro, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      {erro}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end p-6 space-x-3 border-t">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSalvarProposta}
              disabled={calculandoServicos.size > 0}
            >
              {calculandoServicos.size > 0 ? 'Calculando...' : (propostaId ? 'Atualizar Proposta' : 'Salvar Proposta')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
