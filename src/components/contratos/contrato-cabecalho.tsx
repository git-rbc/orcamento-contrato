"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ComboboxSearch } from "@/components/ui/combobox-search";
import { CalendarIcon, UserIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Schema de validação do cabeçalho
const contratoHeaderSchema = z.object({
  codigo_cliente: z.string().optional(),
  cliente_id: z.string().min(1, "Cliente é obrigatório"),
  nome_vendedor: z.string().min(1, "Nome do vendedor é obrigatório"),
  status: z.enum(["Livre", "Ocupado", "Pendente"]).default("Livre"),
  
  // Dados principais do cliente
  nome_completo: z.string().optional(),
  nome_completo_2: z.string().optional(),
  cpf_cnpj: z.string().optional(),
  cpf_cnpj_02: z.string().optional(),
  telefone_01: z.string().optional(),
  telefone_02: z.string().optional(),
  email_01: z.string().optional(),
  email_02: z.string().optional(),
  
  // Endereço
  rua: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  cep: z.string().optional(),
  
  // Outros campos
  reuniao: z.string().optional(),
  pre_vendedor: z.string().optional(),
  origem: z.string().optional(),
  campanha: z.string().optional(),
  negociacao: z.string().optional(),
  entrada_lead: z.string().optional(),
  cod_reuniao: z.string().optional(),
  
  // Dados do evento
  objeto: z.string().optional(),
});

type ContratoHeaderForm = z.infer<typeof contratoHeaderSchema>;

// Interface para cliente selecionado
interface ClienteSelecionado {
  id: string;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  nome_secundario: string;
  cpf_cnpj_secundario: string;
  email_secundario: string;
  telefone_secundario: string;
  numero: string;
  complemento: string;
  bairro: string;
  origem: string;
  campanha: string;
}

interface ContratoHeaderProps {
  onSubmit?: (data: ContratoHeaderForm) => void;
  initialData?: Partial<ContratoHeaderForm>;
}

export function ContratoHeader({ onSubmit, initialData }: ContratoHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteSelecionado | null>(null);
  const [clientes, setClientes] = useState<ClienteSelecionado[]>([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteLoading, setClienteLoading] = useState(false);

  const form = useForm<ContratoHeaderForm>({
    resolver: zodResolver(contratoHeaderSchema),
    defaultValues: {
      codigo_cliente: "",
      cliente_id: "",
      nome_vendedor: "",
      status: "Livre",
      
      // Dados principais do cliente
      nome_completo: "",
      nome_completo_2: "",
      cpf_cnpj: "",
      cpf_cnpj_02: "",
      telefone_01: "",
      telefone_02: "",
      email_01: "",
      email_02: "",
      
      // Endereço
      rua: "",
      numero: "",
      bairro: "",
      cidade: "",
      cep: "",
      
      // Outros campos
      reuniao: "",
      pre_vendedor: "",
      origem: "",
      campanha: "",
      negociacao: "",
      entrada_lead: "",
      cod_reuniao: "",
      
      // Dados do evento
      objeto: "",
      ...initialData,
    },
  });

  // Buscar clientes da API
  useEffect(() => {
    const fetchClientes = async () => {
      if (clienteSearch.length < 1) {
        setClientes([]);
        return;
      }
      
      setClienteLoading(true);
      try {
        // Verificar se a busca é por código (começando com C)
        const isCodigoSearch = clienteSearch.toUpperCase().startsWith('C');
        let url = `/api/clientes?limit=10`;
        
        if (isCodigoSearch) {
          // Buscar por código específico
          url += `&codigo=${encodeURIComponent(clienteSearch.toUpperCase())}`;
        } else {
          // Buscar por nome, CPF/CNPJ
          url += `&search=${encodeURIComponent(clienteSearch)}`;
        }
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setClientes(data.data || []);
        }
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        setClientes([]);
      } finally {
        setClienteLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchClientes, 300);
    return () => clearTimeout(timeoutId);
  }, [clienteSearch]);

  const handleClienteSelect = (cliente: ClienteSelecionado) => {
    setClienteSelecionado(cliente);
    
    // Preencher todos os campos do formulário com os dados do cliente
    form.setValue('cliente_id', cliente.id);
    form.setValue('codigo_cliente', cliente.cpf_cnpj);
    form.setValue('nome_completo', cliente.nome);
    form.setValue('nome_completo_2', cliente.nome_secundario || '');
    form.setValue('cpf_cnpj', cliente.cpf_cnpj);
    form.setValue('cpf_cnpj_02', cliente.cpf_cnpj_secundario || '');
    form.setValue('telefone_01', cliente.telefone);
    form.setValue('telefone_02', cliente.telefone_secundario || '');
    form.setValue('email_01', cliente.email);
    form.setValue('email_02', cliente.email_secundario || '');
    form.setValue('rua', cliente.endereco);
    form.setValue('numero', cliente.numero);
    form.setValue('bairro', cliente.bairro);
    form.setValue('cidade', cliente.cidade);
    form.setValue('cep', cliente.cep);
    form.setValue('origem', cliente.origem || '');
    form.setValue('campanha', cliente.campanha || '');
  };

  const handleSubmit = async (data: ContratoHeaderForm) => {
    setIsLoading(true);
    try {
      await onSubmit?.(data);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Livre":
        return "bg-green-500";
      case "Ocupado":
        return "bg-red-500";
      case "Pendente":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="w-full">
      {/* Faixa superior com logo */}
      <div className="py-2 flex items-center justify-center relative">
        <Image 
          src="/logos/LOGO BRANCA FUNDO TRANSP.png" 
          alt="Indaiá Eventos" 
          width={450} 
          height={180} 
          className="h-28 w-auto"
        />
      </div>

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Novo Contrato</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="codigo-cliente">Cód. Cliente</Label>
              <Input
                id="codigo-cliente"
                placeholder="P92200"
                className="w-20"
                {...form.register("codigo_cliente")}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>Vendedor 2</Label>
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor1">Vendedor 1</SelectItem>
                  <SelectItem value="vendedor2">Vendedor 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge className={`${getStatusColor(form.watch("status"))} text-white`}>
              {form.watch("status")}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Seção Contratado */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-lg">CONTRATADO:</span>
                <span className="text-gray-700">INDE02 EVENTOS LTDA</span>
              </div>
              <div className="text-sm text-gray-600">30.969.797/0001-09</div>
            </div>

            {/* Seção Vendedor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormField
                  control={form.control}
                  name="nome_vendedor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NOME DO VENDEDOR:</FormLabel>
                      <FormControl>
                        <Input placeholder="Carline Munaretto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Seção Seleção de Cliente */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-lg">CONTRATANTE:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cliente_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente:</FormLabel>
                      <FormControl>
                        <ComboboxSearch
                          placeholder="Selecione um cliente..."
                          searchPlaceholder="Digite para buscar cliente..."
                          emptyText="Nenhum cliente encontrado."
                          value={field.value}
                          inputValue={clienteSearch}
                          onInputChange={setClienteSearch}
                          items={clientes.map(cliente => ({
                            id: cliente.id,
                            nome: cliente.nome,
                            cpf_cnpj: cliente.cpf_cnpj,
                          }))}
                          onSelect={(item) => {
                            if (item) {
                              const cliente = clientes.find(c => c.id === item.id);
                              if (cliente) {
                                handleClienteSelect(cliente);
                              }
                            } else {
                              setClienteSelecionado(null);
                              form.setValue('cliente_id', '');
                              form.setValue('codigo_cliente', '');
                            }
                          }}
                          loading={clienteLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Dados do Contratante - Exibir apenas após seleção */}
            {clienteSelecionado && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="nome_completo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reuniao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reunião:</FormLabel>
                        <FormControl>
                          <Input placeholder="Reunião Presencial" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="origem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origem:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="nome_completo_2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo 2:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pre_vendedor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pré-Vendedor:</FormLabel>
                        <FormControl>
                          <Input placeholder="Pedro Azevedo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="campanha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campanha:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cpf_cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF/CNPJ:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cpf_cnpj_02"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF/CNPJ 02:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="negociacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Negociação:</FormLabel>
                        <FormControl>
                          <Input placeholder="Imediato" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="telefone_01"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone 01:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefone_02"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone 02:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="entrada_lead"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entrada Lead:</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="email_01"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail 01:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email_02"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail 02:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="rua"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rua:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cod_reuniao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cód Reunião:</FormLabel>
                        <FormControl>
                          <Input placeholder="P92200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade:</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Objeto */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-lg">OBJETO:</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="objeto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objeto do Contrato:</FormLabel>
                      <FormControl>
                        <Input placeholder="Descreva o objeto do contrato" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}