'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ComboboxSearch } from '@/components/ui/combobox-search';
import { ComboboxEspacos, EspacoItem } from '@/components/ui/combobox-espacos';
import { DatePickerWithHolidays } from '@/components/ui/date-picker-with-holidays';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { EditorContrato } from '@/components/contratos/editor-contrato';
import { ContratoFormData } from '@/types/contrato';

export interface ClienteData {
  id: string;
  nome: string;
  nome_secundario?: string;
  cpf_cnpj: string;
  cpf_cnpj_secundario?: string;
  telefone?: string;
  telefone_secundario?: string;
  email?: string;
  email_secundario?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  origem?: string;
  campanha?: string;
  codigo?: string;
  observacoes?: string;
  created_at?: string;
}

export function NovoContrato() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteLoading, setClienteLoading] = useState(false);
  const [clienteData, setClienteData] = useState<ClienteData | null>(null);
  const [clienteItems, setClienteItems] = useState<{ value: string; label: string }[]>([]);
  const [dataContratacao, setDataContratacao] = useState<Date | undefined>();
  const [dataEvento, setDataEvento] = useState<Date | undefined>();
  const [numContrato, setNumContrato] = useState('');
  const [localEvento, setLocalEvento] = useState('');
  const [espacoSelecionado, setEspacoSelecionado] = useState<EspacoItem | null>(null);
  const [tipoEvento, setTipoEvento] = useState('');
  const [tipoReuniao, setTipoReuniao] = useState('');
  const [preVendedor, setPreVendedor] = useState('');
  const [tipoNegociacao, setTipoNegociacao] = useState('');
  const [codReuniao, setCodReuniao] = useState('');
  const [contratoFormData, setContratoFormData] = useState<ContratoFormData>({
    template_id: '',
    cliente_id: '',
    numero_contrato: '',
    data_contratacao: new Date(),
    data_evento: new Date(),
    local_evento: '',
    tipo_evento: '',
    numero_convidados: 0,
    cod_reuniao: '',
    servicos: 'Locação - Alimentação - Bebidas'
  });

  // Carregar clientes na inicialização
  useEffect(() => {
    fetchClientes();
  }, []);

  // Sincronizar dados do formulário
  useEffect(() => {
    setContratoFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      numero_contrato: numContrato,
      data_contratacao: dataContratacao || new Date(),
      data_evento: dataEvento || new Date(),
      local_evento: localEvento,
      tipo_evento: tipoEvento,
      cod_reuniao: codReuniao
    }));
  }, [clienteId, numContrato, dataContratacao, dataEvento, localEvento, tipoEvento, codReuniao]);

  // Buscar clientes do banco
  useEffect(() => {
    if (clienteSearch.length >= 2) {
      fetchClientes();
    } else if (clienteSearch.length === 0) {
      // Quando vazio, mostrar todos os clientes
      fetchClientes();
    } else {
      setClienteItems([]);
    }
  }, [clienteSearch]);

  const fetchClientes = async () => {
    setClienteLoading(true);
    try {
      console.log('Buscando clientes com termo:', clienteSearch);
      const response = await fetch(`/api/clientes/search?q=${encodeURIComponent(clienteSearch)}`);
      
      if (!response.ok) {
        console.error('Erro na resposta:', response.status, response.statusText);
      }
      
      const data = await response.json();
      console.log('Resposta da busca de clientes:', data);
      
      if (data.data && Array.isArray(data.data)) {
        const items = data.data.map((cliente: any) => ({
          value: cliente.id,
          label: `${cliente.nome} - ${cliente.cpf_cnpj}`
        }));
        console.log('Items formatados:', items);
        setClienteItems(items);
      } else {
        console.log('Nenhum cliente encontrado ou formato inválido');
        setClienteItems([]);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      setClienteItems([]);
    } finally {
      setClienteLoading(false);
    }
  };

  const fetchClienteDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/clientes/${id}`);
      const data = await response.json();
      
      if (data.data) {
        setClienteData(data.data);
        
        // Gerar número do contrato baseado no ID do cliente
        const currentYear = new Date().getFullYear();
        const clienteInitials = data.data.nome.substring(0, 3).toUpperCase();
        setNumContrato(`C-${currentYear}-${clienteInitials}-${id.substring(0, 4)}`);
        
        // Autopreencher data de contratação com a data atual
        if (!dataContratacao) {
          setDataContratacao(new Date());
        }
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do cliente:', error);
    }
  };

  const handleClienteSelect = async (item: any) => {
    const id = item?.value || item?.id;
    setClienteId(id);
    if (id) {
      await fetchClienteDetails(id);
    } else {
      setClienteData(null);
    }
  };

  const handleEspacoSelect = (espaco: EspacoItem) => {
    setEspacoSelecionado(espaco);
    setLocalEvento(`${espaco.nome} - ${espaco.cidade} (${espaco.capacidade_maxima})`);
  };

  const handleVoltar = () => {
    router.push('/dashboard/contratos');
  };

  const handleSalvarContrato = async (conteudo: string, pdfUrl?: string) => {
    try {
      if (!clienteData || !contratoFormData.numero_contrato) {
        alert('Preencha todos os campos obrigatórios');
        return;
      }

      const response = await fetch('/api/contratos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...contratoFormData,
          cliente_id: clienteData.id,
          conteudo,
          pdf_url: pdfUrl
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Contrato salvo com sucesso!');
        router.push('/dashboard/contratos');
      } else {
        alert(data.error || 'Erro ao salvar contrato');
      }
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
      alert('Erro ao salvar contrato');
    }
  };

  const handleSalvar = () => {
    // Implementar lógica de salvamento básica
    console.log('Salvando dados do cabeçalho...');
  };

  return (
    <div className="space-y-6">
      {/* Header com botões */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleVoltar}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Novo Contrato</h1>
            <p className="text-muted-foreground">
              Preencha os dados para gerar um novo contrato
            </p>
          </div>
        </div>
        <Button onClick={handleSalvar}>
          <Save className="mr-2 h-4 w-4" />
          Salvar Contrato
        </Button>
      </div>

      {/* Cabeçalho do Contrato */}
      <Card className="overflow-hidden">
        {/* Faixa superior com logo e informações da contratada */}
        <div className="bg-zinc-800 py-8">
          <div className="max-w-6xl mx-auto px-8 flex items-center justify-between">
            <Image 
              src="/logos/LOGO BRANCA FUNDO TRANSP.png" 
              alt="Logo" 
              width={200} 
              height={80} 
              className="object-contain"
            />
            <div className="text-white text-right">
              <p className="font-bold text-lg">Asura Kenji</p>
              <p className="text-sm">INDEX02 EVENTOS LTDA.</p>
              <p className="text-sm">30.969.797/0001-09</p>
            </div>
          </div>
        </div>

        {/* Formulário do cabeçalho */}
        <div className="p-8">
          {/* Seleção do Cliente */}
          <div className="mb-8 pb-6 border-b">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <label className="font-medium text-sm whitespace-nowrap">Selecionar Cliente:</label>
                <ComboboxSearch
                  placeholder="Buscar cliente..."
                  searchPlaceholder="Digite para buscar..."
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
          </div>

          {/* Dados do Cliente - 2 colunas */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
            {/* Coluna 1 */}
            <div className="space-y-3">
              <div className="flex">
                <span className="font-medium min-w-[140px]">Nome Completo:</span>
                <span className="flex-1">{clienteData?.nome || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-medium min-w-[140px]">CPF/CNPJ:</span>
                <span className="flex-1">{clienteData?.cpf_cnpj || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-medium min-w-[140px]">Telefone 01:</span>
                <span className="flex-1">{clienteData?.telefone || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-medium min-w-[140px]">E-mail 01:</span>
                <span className="flex-1">{clienteData?.email || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-medium min-w-[140px]">Rua:</span>
                <span className="flex-1">{clienteData?.endereco || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-medium min-w-[140px]">Bairro:</span>
                <span className="flex-1">{clienteData?.bairro || '-'}</span>
              </div>
            </div>

            {/* Coluna 2 */}
            <div className="space-y-3">
              <div className="flex">
                <span className="font-medium min-w-[140px]">Reunião:</span>
                <Input 
                  value={tipoReuniao} 
                  onChange={(e) => setTipoReuniao(e.target.value)}
                  placeholder="Ex: Reunião Presencial"
                  className="flex-1" 
                />
              </div>
              <div className="flex">
                <span className="font-medium min-w-[140px]">Pré-Vendedor:</span>
                <Input 
                  value={preVendedor} 
                  onChange={(e) => setPreVendedor(e.target.value)}
                  placeholder="Nome do pré-vendedor"
                  className="flex-1" 
                />
              </div>
              <div className="flex">
                <span className="font-medium min-w-[140px]">Cód Reunião:</span>
                <Input 
                  value={codReuniao} 
                  onChange={(e) => setCodReuniao(e.target.value)}
                  placeholder="Ex: P80215"
                  className="flex-1" 
                />
              </div>
              <div className="flex">
                <span className="font-medium min-w-[140px]">Número:</span>
                <span className="flex-1">{clienteData?.numero || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-medium min-w-[140px]">Cidade:</span>
                <span className="flex-1">{clienteData?.cidade || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-medium min-w-[140px]">CEP:</span>
                <span className="flex-1">{clienteData?.cep || '-'}</span>
              </div>
            </div>

          </div>

          {/* Campos editáveis do contrato */}
          <div className="mt-8 pt-6 border-t grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="font-medium text-sm min-w-[140px]">Nº Contrato:</label>
                <Input 
                  value={numContrato}
                  onChange={(e) => setNumContrato(e.target.value)}
                  placeholder="C-2024-001" 
                  className="flex-1" 
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="font-medium text-sm min-w-[140px]">Data Contratação:</label>
                <DatePickerWithHolidays
                  date={dataContratacao}
                  setDate={setDataContratacao}

                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="font-medium text-sm min-w-[140px]">Local do Evento:</label>
                <ComboboxEspacos
                  placeholder="Selecione um espaço..."
                  searchPlaceholder="Buscar espaços..."
                  emptyText="Nenhum espaço encontrado."
                  value={espacoSelecionado?.id}
                  onSelect={handleEspacoSelect}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="font-medium text-sm min-w-[140px]">Vendedor:</label>
                <Input value={userProfile?.nome || ''} disabled readOnly className="flex-1" />
              </div>
              <div className="flex items-center gap-4">
                <label className="font-medium text-sm min-w-[140px]">Data do Evento:</label>
                <DatePickerWithHolidays
                  date={dataEvento}
                  setDate={setDataEvento}

                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="font-medium text-sm min-w-[140px]">Tipo de Evento:</label>
                <Input 
                  value={tipoEvento}
                  onChange={(e) => setTipoEvento(e.target.value)}
                  placeholder="Ex: Casamento, Corporativo" 
                  className="flex-1" 
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Editor de Contratos */}
      <EditorContrato
        clienteData={clienteData}
        vendedor={userProfile?.nome || ''}
        formData={contratoFormData}
        onFormDataChange={setContratoFormData}
        onSave={handleSalvarContrato}
      />
    </div>
  );
}