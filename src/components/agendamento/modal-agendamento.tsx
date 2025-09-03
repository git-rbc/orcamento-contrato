'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
}

interface AgendamentoData {
  cliente_id: string;
  cliente_nome: string;
  telefone: string;
  vendedor_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  local_atendimento: string;
  status_local: string;
  cidade: string;
  tipo: 'reuniao' | 'reserva_temporaria' | 'fila_espera';
  observacoes: string;
}

interface SlotSelecionado {
  data: string;
  hora: string;
  vendedor?: string;
}

interface ModalAgendamentoProps {
  open: boolean;
  onClose: () => void;
  onSalvar: (dados: AgendamentoData) => Promise<void>;
  slotSelecionado: SlotSelecionado | null;
  agendamentoData: AgendamentoData;
  setAgendamentoData: (data: AgendamentoData | ((prev: AgendamentoData) => AgendamentoData)) => void;
}

// Status/Locais disponíveis conforme planilha
const STATUS_LOCAIS = [
  { valor: 'online', nome: '🟠 ONLINE', cor: '#F97316', categoria: 'online' },
  { valor: 'itapema', nome: '🟡 ITAPEMA', cor: '#EAB308', categoria: 'cidade' },
  { valor: 'joinville', nome: '🟢 JOINVILLE', cor: '#22C55E', categoria: 'cidade' },
  { valor: 'florianopolis', nome: '🟣 FLORIANÓPOLIS', cor: '#8B5CF6', categoria: 'cidade' },
  { valor: 'blumenau', nome: '🟤 BLUMENAU', cor: '#A16207', categoria: 'cidade' },
  { valor: 'nova_veneza', nome: '⚪ NOVA VENEZA', cor: '#E5E7EB', categoria: 'cidade' },
  { valor: 'atend_pessoal', nome: '🔵 ATEND. PESSOAL / REUN. SEMANAL', cor: '#3B82F6', categoria: 'especial' },
  { valor: 'treinamento', nome: '⚫ TREINAMENTO', cor: '#1F2937', categoria: 'especial' }
];

// Cidades disponíveis para atendimento presencial
const CIDADES = [
  { valor: 'itapema', nome: 'Itapema' },
  { valor: 'joinville', nome: 'Joinville' },
  { valor: 'florianopolis', nome: 'Florianópolis' },
  { valor: 'blumenau', nome: 'Blumenau' },
  { valor: 'nova_veneza', nome: 'Nova Veneza' }
];

export function ModalAgendamento({
  open,
  onClose,
  onSalvar,
  slotSelecionado,
  agendamentoData,
  setAgendamentoData
}: ModalAgendamentoProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  // Carregar clientes quando modal abrir
  useEffect(() => {
    if (open && clientes.length === 0) {
      loadClientes();
    }
  }, [open]);

  async function loadClientes() {
    try {
      setLoadingClientes(true);
      const response = await fetch('/api/agendamento/clientes');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Clientes carregados:', data.clientes);
        setClientes(data.clientes || []);
      } else {
        console.error('Erro ao carregar clientes');
        toast({
          title: 'Aviso',
          description: 'Erro ao carregar lista de clientes',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoadingClientes(false);
    }
  }

  function handleClienteChange(clienteId: string) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setAgendamentoData(prev => ({
        ...prev,
        cliente_id: clienteId,
        cliente_nome: cliente.nome,
        telefone: cliente.telefone || ''
      }));
    }
  }

  function handleTipoAtendimentoChange(tipo: string) {
    setAgendamentoData(prev => ({
      ...prev,
      local_atendimento: tipo,
      // Reset campos dependentes
      status_local: tipo === 'online' ? 'online' : 'itapema',
      cidade: tipo === 'presencial' ? 'itapema' : ''
    }));
  }

  async function handleSalvar() {
    try {
      // Validação do cliente
      if (!agendamentoData.cliente_id) {
        toast({
          title: 'Erro',
          description: 'Selecione um cliente',
          variant: 'destructive'
        });
        return;
      }

      // Validação da cidade para atendimento presencial
      if (agendamentoData.local_atendimento === 'presencial' && !agendamentoData.cidade) {
        toast({
          title: 'Erro',
          description: 'Selecione uma cidade para atendimento presencial',
          variant: 'destructive'
        });
        return;
      }

      await onSalvar(agendamentoData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
    }
  }

  if (!slotSelecionado) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Novo Agendamento
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {slotSelecionado.vendedor} - {slotSelecionado.data} às {slotSelecionado.hora}
          </p>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente *</Label>
            <Select
              value={agendamentoData.cliente_id}
              onValueChange={handleClienteChange}
              disabled={loadingClientes}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingClientes ? "Carregando clientes..." : "Selecione um cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome} {cliente.email && `(${cliente.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Atendimento */}
          <div className="space-y-2">
            <Label htmlFor="tipoAtendimento">Tipo de Atendimento *</Label>
            <Select
              value={agendamentoData.local_atendimento}
              onValueChange={handleTipoAtendimentoChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cidade (apenas para presencial) */}
          {agendamentoData.local_atendimento === 'presencial' && (
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade *</Label>
              <Select
                value={agendamentoData.cidade}
                onValueChange={(cidade) => setAgendamentoData(prev => ({ ...prev, cidade }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma cidade" />
                </SelectTrigger>
                <SelectContent>
                  {CIDADES.map((cidade) => (
                    <SelectItem key={cidade.valor} value={cidade.valor}>
                      {cidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status/Local */}
          <div className="space-y-2">
            <Label htmlFor="statusLocal">Tipo de Serviço</Label>
            <Select
              value={agendamentoData.status_local}
              onValueChange={(status) => setAgendamentoData(prev => ({ ...prev, status_local: status }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_LOCAIS.filter(s => 
                  agendamentoData.local_atendimento === 'online' 
                    ? s.categoria === 'online' || s.categoria === 'especial'
                    : s.categoria === 'cidade' || s.categoria === 'especial'
                ).map((status) => (
                  <SelectItem key={status.valor} value={status.valor}>
                    {status.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Evento */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Evento</Label>
            <Select
              value={agendamentoData.tipo}
              onValueChange={(tipo: 'reuniao' | 'reserva_temporaria' | 'fila_espera') => 
                setAgendamentoData(prev => ({ ...prev, tipo }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reuniao">Reunião</SelectItem>
                <SelectItem value="reserva_temporaria">Reserva Temporária</SelectItem>
                <SelectItem value="fila_espera">Fila de Espera</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Input
              id="observacoes"
              value={agendamentoData.observacoes}
              onChange={(e) => setAgendamentoData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}