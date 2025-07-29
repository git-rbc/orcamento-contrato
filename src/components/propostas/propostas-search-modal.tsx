import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Search, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PropostasSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filtros: any) => void;
  currentFilters: any;
}

interface Cliente {
  id: string;
  nome: string;
  email: string;
}

interface Espaco {
  id: string;
  nome: string;
}

interface Vendedor {
  id: string;
  nome: string;
}

export function PropostasSearchModal({ 
  open, 
  onOpenChange, 
  onApplyFilters, 
  currentFilters 
}: PropostasSearchModalProps) {
  const [filtros, setFiltros] = useState({
    cliente: '',
    clienteNome: '',
    status: '',
    dataInicio: null as Date | null,
    dataFim: null as Date | null,
    valorMin: '',
    valorMax: '',
    espaco: '',
    vendedor: '',
    numPessoasMin: '',
    numPessoasMax: '',
    codigo: '',
  });

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar filtros atuais quando modal abrir
  useEffect(() => {
    if (open) {
      setFiltros({
        cliente: currentFilters.cliente || '',
        clienteNome: currentFilters.clienteNome || '',
        status: currentFilters.status || '',
        dataInicio: currentFilters.dataInicio ? new Date(currentFilters.dataInicio) : null,
        dataFim: currentFilters.dataFim ? new Date(currentFilters.dataFim) : null,
        valorMin: currentFilters.valorMin || '',
        valorMax: currentFilters.valorMax || '',
        espaco: currentFilters.espaco || '',
        vendedor: currentFilters.vendedor || '',
        numPessoasMin: currentFilters.numPessoasMin || '',
        numPessoasMax: currentFilters.numPessoasMax || '',
        codigo: currentFilters.codigo || '',
      });
      loadData();
    }
  }, [open, currentFilters]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar clientes
      const clientesResponse = await fetch('/api/clientes?limit=100');
      if (clientesResponse.ok) {
        const clientesData = await clientesResponse.json();
        setClientes(clientesData.data || []);
      }

      // Carregar espaços
      const espacosResponse = await fetch('/api/espacos-eventos');
      if (espacosResponse.ok) {
        const espacosData = await espacosResponse.json();
        setEspacos(espacosData.data || []);
      }

      // Carregar vendedores (usuários)
      const vendedoresResponse = await fetch('/api/users');
      if (vendedoresResponse.ok) {
        const vendedoresData = await vendedoresResponse.json();
        setVendedores(vendedoresData.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const filtrosLimpos = Object.fromEntries(
      Object.entries(filtros).filter(([_, value]) => 
        value !== '' && value !== null && value !== undefined
      )
    );
    onApplyFilters(filtrosLimpos);
  };

  const handleClear = () => {
    setFiltros({
      cliente: '',
      clienteNome: '',
      status: '',
      dataInicio: null,
      dataFim: null,
      valorMin: '',
      valorMax: '',
      espaco: '',
      vendedor: '',
      numPessoasMin: '',
      numPessoasMax: '',
      codigo: '',
    });
  };

  const statusOptions = [
    { value: 'rascunho', label: 'Rascunho' },
    { value: 'enviada', label: 'Enviada' },
    { value: 'aceita', label: 'Aceita' },
    { value: 'recusada', label: 'Recusada' },
    { value: 'cancelada', label: 'Cancelada' },
    { value: 'convertida', label: 'Convertida' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Pesquisa Avançada de Propostas
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Select value={filtros.cliente} onValueChange={(value) => setFiltros({...filtros, cliente: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nome do Cliente (busca por texto) */}
          <div className="space-y-2">
            <Label htmlFor="clienteNome">Nome do Cliente</Label>
            <Input
              id="clienteNome"
              placeholder="Digite o nome do cliente"
              value={filtros.clienteNome}
              onChange={(e) => setFiltros({...filtros, clienteNome: e.target.value})}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={filtros.status} onValueChange={(value) => setFiltros({...filtros, status: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Código da Reunião */}
          <div className="space-y-2">
            <Label htmlFor="codigo">Código da Reunião</Label>
            <Input
              id="codigo"
              placeholder="Digite o código"
              value={filtros.codigo}
              onChange={(e) => setFiltros({...filtros, codigo: e.target.value})}
            />
          </div>

          {/* Data Início */}
          <div className="space-y-2">
            <Label>Data de Realização - Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filtros.dataInicio && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filtros.dataInicio ? (
                    format(filtros.dataInicio, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filtros.dataInicio || undefined}
                  onSelect={(date) => setFiltros({...filtros, dataInicio: date || null})}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Data Fim */}
          <div className="space-y-2">
            <Label>Data de Realização - Fim</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filtros.dataFim && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filtros.dataFim ? (
                    format(filtros.dataFim, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filtros.dataFim || undefined}
                  onSelect={(date) => setFiltros({...filtros, dataFim: date || null})}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Valor Mínimo */}
          <div className="space-y-2">
            <Label htmlFor="valorMin">Valor Mínimo (R$)</Label>
            <Input
              id="valorMin"
              type="number"
              placeholder="0,00"
              value={filtros.valorMin}
              onChange={(e) => setFiltros({...filtros, valorMin: e.target.value})}
            />
          </div>

          {/* Valor Máximo */}
          <div className="space-y-2">
            <Label htmlFor="valorMax">Valor Máximo (R$)</Label>
            <Input
              id="valorMax"
              type="number"
              placeholder="0,00"
              value={filtros.valorMax}
              onChange={(e) => setFiltros({...filtros, valorMax: e.target.value})}
            />
          </div>

          {/* Espaço */}
          <div className="space-y-2">
            <Label htmlFor="espaco">Local/Espaço</Label>
            <Select value={filtros.espaco} onValueChange={(value) => setFiltros({...filtros, espaco: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um espaço" />
              </SelectTrigger>
              <SelectContent>
                {espacos.map((espaco) => (
                  <SelectItem key={espaco.id} value={espaco.id}>
                    {espaco.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendedor */}
          <div className="space-y-2">
            <Label htmlFor="vendedor">Vendedor</Label>
            <Select value={filtros.vendedor} onValueChange={(value) => setFiltros({...filtros, vendedor: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((vendedor) => (
                  <SelectItem key={vendedor.id} value={vendedor.id}>
                    {vendedor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Número de Pessoas Mínimo */}
          <div className="space-y-2">
            <Label htmlFor="numPessoasMin">Pessoas (Mínimo)</Label>
            <Input
              id="numPessoasMin"
              type="number"
              placeholder="0"
              value={filtros.numPessoasMin}
              onChange={(e) => setFiltros({...filtros, numPessoasMin: e.target.value})}
            />
          </div>

          {/* Número de Pessoas Máximo */}
          <div className="space-y-2">
            <Label htmlFor="numPessoasMax">Pessoas (Máximo)</Label>
            <Input
              id="numPessoasMax"
              type="number"
              placeholder="0"
              value={filtros.numPessoasMax}
              onChange={(e) => setFiltros({...filtros, numPessoasMax: e.target.value})}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClear}>
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            Aplicar Filtros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}