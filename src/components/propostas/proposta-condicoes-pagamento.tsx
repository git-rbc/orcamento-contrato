import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
}

interface Props { 
  totalProposta: number;
  onValorEntradaChange: (value: number) => void;
  onCondicoesPagamentoChange?: (condicoes: CondicoesPagamentoState) => void;
  initialValues?: Partial<CondicoesPagamentoState>;
}

export function PropostaCondicoesPagamento({ totalProposta, onValorEntradaChange, onCondicoesPagamentoChange, initialValues }: Props) {
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
  });

  const formaPgtoOptions = ['PIX','Cartão de Crédito (Máquina)','Cartão de Crédito (Vindi)','Boleto (Vindi)','Dinheiro','TED'];
  const statusPgtoOptions = ['Realizado durante a reunião','Será realizado com o Pós Vendas'];
  const formaSaldoFinalOptions = ['Visa','Mastercard','Elo','American Express','A ser pago até 30 dias antes do evento'];
  const negociacaoOptions = ['Imediato','Pós Reunião','Ação Gerente','Corporativo'];

  const valorRestante = Math.max(totalProposta - state.valorEntrada, 0);
  const valorParcela = state.qtdMeses > 0 ? valorRestante / state.qtdMeses : 0;

  const resumoSimulador = () => {
    const entradaTxt = state.entrada === 'Sim' && state.valorEntrada > 0
      ? `Entrada de ${state.valorEntrada.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} via ${state.formaPagamentoEntrada || '-'} (${state.statusPagamentoEntrada||'-'})`
      : 'Sem entrada';

    const parcelasTxt = valorRestante > 0 && state.qtdMeses > 0
      ? `${state.qtdMeses}x de ${valorParcela.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`
      : '';

    return `${entradaTxt}${parcelasTxt ? ' • ' + parcelasTxt : ''}`;
  };

  const handleChange = (field: keyof CondicoesPagamentoState, value: any) => {
    let newState = { ...state };
    
    if (field === 'reajuste') {
      if (value === 'Não') {
        newState = { ...state, reajuste: value, juros: 0 };
      } else {
        newState = { ...state, [field]: value };
      }
    } else if (field === 'valorEntrada') {
      const num = value === '' ? 0 : Number(value);
      newState = { ...state, valorEntrada: num };
      onValorEntradaChange(num);
    } else {
      newState = { ...state, [field]: value };
    }
    
    setState(newState);
    onCondicoesPagamentoChange?.(newState);
  };

  return (
    <div className="border rounded overflow-hidden">
      <div className="bg-zinc-200 dark:bg-zinc-800 text-center font-semibold py-1">Financeiro</div>

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
          <label className="text-sm font-medium">Reajuste</label>
          <Select value={state.reajuste} onValueChange={val=>handleChange('reajuste', val as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Sim">Sim</SelectItem>
              <SelectItem value="Não">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 space-y-1">
          <label className="text-sm font-medium">Juros (%)</label>
          <Input 
            type="number" 
            value={state.juros} 
            onChange={e=>handleChange('juros', Number(e.target.value))}
            disabled={state.reajuste !== 'Sim'}
          />
        </div>
      </div>

      {/* Entrada */}
      <div className="border-b">
        <div className="bg-zinc-100 dark:bg-zinc-900/40 px-4 py-1 text-sm font-semibold">ENTRADA</div>
        <div className="p-4 grid md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-sm">Entrada?</label>
            <Select value={state.entrada} onValueChange={val=>handleChange('entrada', val as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm">Valor</label>
            <Input 
              type="number" 
              value={state.valorEntrada === 0 ? '' : state.valorEntrada}
              onChange={e=>handleChange('valorEntrada', e.target.value)}
              disabled={state.entrada!=='Sim'}
            />
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
            <label className="text-sm">Qtd. Parcelas</label>
            <Select value={String(state.qtdMeses)} onValueChange={val=>handleChange('qtdMeses', Number(val))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({length:18},(_,i)=>i+1).map(n => (
                  <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm">Dia Vencimento</label>
            <Input type="number" value={state.diaVencimento} onChange={e=>handleChange('diaVencimento', Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Saldo */}
      <div className="border-b">
        <div className="bg-zinc-100 dark:bg-zinc-900/40 px-4 py-1 text-sm font-semibold">SALDO</div>
        <div className="p-4 grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm">Forma Pag. Saldo Final</label>
            <Select value={state.formaSaldoFinal} onValueChange={val=>handleChange('formaSaldoFinal', val)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {formaSaldoFinalOptions.map(op => (
                  <SelectItem key={op} value={op}>{op}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

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
