'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerWithHolidays } from '@/components/ui/date-picker-with-holidays';
import { ComboboxSearch } from '@/components/ui/combobox-search';
import { toast } from 'sonner';
import { buscarClientesParaSelect } from '@/services/clientes-client';

// Interface para o ComboboxSearch
interface SearchItem {
  id?: string;
  nome?: string;
  cpf_cnpj?: string;
}

interface CupomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cupom?: any; // Para edição futura
}

export function CupomModal({ open, onOpenChange, cupom }: CupomModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    tipo_desconto: 'percentual' as 'percentual' | 'valor_fixo',
    valor_desconto: '',
    valor_minimo_pedido: '',
    data_inicio: undefined as Date | undefined,
    data_fim: undefined as Date | undefined,
    limite_uso: '',
    cliente_especifico_id: '',
    dias_semana: [] as string[],
    nivel_acesso: 'vendedor' as 'admin' | 'vendedor',
    ativo: true
  });

  const [loading, setLoading] = useState(false);

  // States for Cliente Combobox
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteItems, setClienteItems] = useState<SearchItem[]>([]);
  const [clienteLoading, setClienteLoading] = useState(false);

  // Preencher formulário quando cupom for fornecido para edição
  useEffect(() => {
    if (cupom) {
      setFormData({
        nome: cupom.nome || '',
        codigo: cupom.codigo || '',
        descricao: cupom.descricao || '',
        tipo_desconto: cupom.tipo_desconto || 'percentual',
        valor_desconto: cupom.valor_desconto?.toString() || '',
        valor_minimo_pedido: cupom.valor_minimo_pedido?.toString() || '',
        data_inicio: cupom.data_inicio ? new Date(cupom.data_inicio) : undefined,
        data_fim: cupom.data_fim ? new Date(cupom.data_fim) : undefined,
        limite_uso: cupom.limite_uso?.toString() || '',
        cliente_especifico_id: cupom.cliente_especifico_id || '',
        dias_semana: cupom.dias_semana || [],
        nivel_acesso: cupom.nivel_acesso || 'vendedor',
        ativo: cupom.ativo ?? true
      });

      // Se há cliente específico, definir o nome para exibição
      if (cupom.cliente_especifico_id && cupom.cliente_especifico) {
        setClienteItems([{
          id: cupom.cliente_especifico_id,
          nome: cupom.cliente_especifico.nome || '',
          cpf_cnpj: cupom.cliente_especifico.cpf_cnpj
        }]);
      }
    } else {
      // Reset form para criação
      setFormData({
        nome: '',
        codigo: '',
        descricao: '',
        tipo_desconto: 'percentual',
        valor_desconto: '',
        valor_minimo_pedido: '',
        data_inicio: undefined,
        data_fim: undefined,
        limite_uso: '',
        cliente_especifico_id: '',
        dias_semana: [],
        nivel_acesso: 'vendedor',
        ativo: true
      });
      setClienteSearch('');
      setClienteItems([]);
    }
  }, [cupom, open]);

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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClienteSelect = (item: SearchItem | null) => {
    setFormData(prev => ({
      ...prev,
      cliente_especifico_id: item?.id || ''
    }));
  };

  const handleDiasSemanaChange = (dia: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      dias_semana: checked 
        ? [...prev.dias_semana, dia]
        : prev.dias_semana.filter(d => d !== dia)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!formData.codigo.trim()) {
      toast.error('Código é obrigatório');
      return;
    }

    if (!formData.valor_desconto || Number(formData.valor_desconto) <= 0) {
      toast.error('Valor do desconto deve ser maior que zero');
      return;
    }

    if (formData.tipo_desconto === 'percentual' && Number(formData.valor_desconto) > 100) {
      toast.error('Desconto percentual não pode ser maior que 100%');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        valor_desconto: Number(formData.valor_desconto),
        valor_minimo_pedido: formData.valor_minimo_pedido ? Number(formData.valor_minimo_pedido) : null,
        limite_uso: formData.limite_uso ? Number(formData.limite_uso) : null,
        cliente_especifico_id: formData.cliente_especifico_id || null,
        dias_semana: formData.dias_semana.length > 0 ? formData.dias_semana : null,
        data_inicio: formData.data_inicio?.toISOString().split('T')[0] || null,
        data_fim: formData.data_fim?.toISOString().split('T')[0] || null
      };

      const response = await fetch('/api/cupons', {
        method: cupom ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cupom ? { ...payload, id: cupom.id } : payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar cupom');
      }

      toast.success(cupom ? 'Cupom atualizado com sucesso!' : 'Cupom criado com sucesso!');
      onOpenChange(false);
      
      // Reset form apenas se não estiver editando
      if (!cupom) {
        setFormData({
          nome: '',
          codigo: '',
          descricao: '',
          tipo_desconto: 'percentual',
          valor_desconto: '',
          valor_minimo_pedido: '',
          data_inicio: undefined,
          data_fim: undefined,
          limite_uso: '',
          cliente_especifico_id: '',
          dias_semana: [],
          nivel_acesso: 'vendedor',
          ativo: true
        });
        setClienteSearch('');
        setClienteItems([]);
      }

    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar cupom');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cupom ? 'Editar Cupom' : 'Cadastrar Novo Cupom'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Cupom *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Ex: Desconto Black Friday"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo">Código do Cupom *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => handleInputChange('codigo', e.target.value.toUpperCase())}
                placeholder="Ex: BLACKFRIDAY2024"
                className="uppercase"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              placeholder="Descrição opcional do cupom"
              rows={3}
            />
          </div>

          {/* Configurações de Desconto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_desconto">Tipo de Desconto *</Label>
              <Select
                value={formData.tipo_desconto}
                onValueChange={(value) => handleInputChange('tipo_desconto', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_desconto">
                Valor do Desconto * 
                {formData.tipo_desconto === 'percentual' ? ' (%)' : ' (R$)'}
              </Label>
              <Input
                id="valor_desconto"
                type="number"
                step={formData.tipo_desconto === 'percentual' ? '0.01' : '0.01'}
                min="0"
                max={formData.tipo_desconto === 'percentual' ? '100' : undefined}
                value={formData.valor_desconto}
                onChange={(e) => handleInputChange('valor_desconto', e.target.value)}
                placeholder={formData.tipo_desconto === 'percentual' ? '10' : '50.00'}
                required
              />
            </div>
          </div>

          {/* Restrições */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_minimo_pedido">Valor Mínimo do Pedido (R$)</Label>
              <Input
                id="valor_minimo_pedido"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_minimo_pedido}
                onChange={(e) => handleInputChange('valor_minimo_pedido', e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limite_uso">Limite Total de Uso</Label>
              <Input
                id="limite_uso"
                type="number"
                min="1"
                value={formData.limite_uso}
                onChange={(e) => handleInputChange('limite_uso', e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* Cliente Específico */}
          <div className="space-y-2">
            <Label htmlFor="cliente_especifico">Cliente Específico (Opcional)</Label>
            <ComboboxSearch
              placeholder="Selecione um cliente..."
              searchPlaceholder="Digite para buscar cliente..."
              emptyText="Nenhum cliente encontrado."
              value={formData.cliente_especifico_id}
              onSelect={handleClienteSelect}
              items={clienteItems}
              loading={clienteLoading}
              inputValue={clienteSearch}
              onInputChange={setClienteSearch}
              formatDisplay={(item) => `${item.nome} - ${item.cpf_cnpj}`}
            />
            {formData.cliente_especifico_id && (
              <p className="text-sm text-muted-foreground mt-1">
                ℹ️ Este cupom só poderá ser aplicado ao cliente selecionado
              </p>
            )}
          </div>

          {/* Datas de Validade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <DatePickerWithHolidays
                date={formData.data_inicio}
                setDate={(date) => handleInputChange('data_inicio', date)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Fim</Label>
              <DatePickerWithHolidays
                date={formData.data_fim}
                setDate={(date) => handleInputChange('data_fim', date)}
              />
            </div>
          </div>

          {/* Dias da Semana */}
          <div className="space-y-2">
            <Label>Dias da Semana Válidos (Opcional)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { key: 'segunda', label: 'Segunda' },
                { key: 'terça', label: 'Terça' },
                { key: 'quarta', label: 'Quarta' },
                { key: 'quinta', label: 'Quinta' },
                { key: 'sexta', label: 'Sexta' },
                { key: 'sábado', label: 'Sábado' },
                { key: 'domingo', label: 'Domingo' }
              ].map((dia) => (
                <div key={dia.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dia-${dia.key}`}
                    checked={formData.dias_semana.includes(dia.key)}
                    onCheckedChange={(checked) => handleDiasSemanaChange(dia.key, checked as boolean)}
                  />
                  <Label htmlFor={`dia-${dia.key}`} className="text-sm font-normal">
                    {dia.label}
                  </Label>
                </div>
              ))}
            </div>
            {formData.dias_semana.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                ℹ️ Se nenhum dia for selecionado, o cupom será válido para qualquer dia da semana
              </p>
            )}
            {formData.dias_semana.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                ✅ Cupom válido apenas para: {formData.dias_semana.join(', ')}
              </p>
            )}
          </div>

          {/* Configurações de Acesso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nivel_acesso">Nível de Acesso *</Label>
              <Select
                value={formData.nivel_acesso}
                onValueChange={(value) => handleInputChange('nivel_acesso', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor (Todos podem usar)</SelectItem>
                  <SelectItem value="admin">Admin (Apenas administradores)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ativo">Status</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                />
                <Label htmlFor="ativo" className="text-sm">
                  {formData.ativo ? 'Ativo' : 'Inativo'}
                </Label>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (cupom ? 'Atualizar' : 'Cadastrar')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}