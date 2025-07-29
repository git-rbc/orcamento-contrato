'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { 
  Loader2, 
  User, 
  MapPin, 
  FileText,
  ArrowLeft,
  ArrowRight,
  Check
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Form,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

import { Cliente } from '@/types/database'
import { isValidCPF, isValidCNPJ } from '@/lib/utils'

// Dynamic imports for form steps
const DadosPrincipaisStep = dynamic(() => import('./cliente-form-steps/dados-principais-step').then(mod => mod.DadosPrincipaisStep), {
  loading: () => <Loader2 className="mx-auto h-8 w-8 animate-spin" />,
});
const EnderecoStep = dynamic(() => import('./cliente-form-steps/endereco-step').then(mod => mod.EnderecoStep), {
  loading: () => <Loader2 className="mx-auto h-8 w-8 animate-spin" />,
});
const InformacoesAdicionaisStep = dynamic(() => import('./cliente-form-steps/informacoes-adicionais-step').then(mod => mod.InformacoesAdicionaisStep), {
  loading: () => <Loader2 className="mx-auto h-8 w-8 animate-spin" />,
});


// Schemas de validação por etapa
const dadosPrincipaisSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  nome_secundario: z.string().optional(),
  cpf_cnpj: z.string().refine((val) => {
    const clean = val.replace(/\D/g, '')
    return clean.length === 11 ? isValidCPF(clean) : isValidCNPJ(clean)
  }, 'CPF/CNPJ inválido'),
  cpf_cnpj_secundario: z.string().optional().refine((val) => {
    if (!val) return true
    const clean = val.replace(/\D/g, '')
    if (clean.length === 0) return true
    return clean.length === 11 ? isValidCPF(clean) : isValidCNPJ(clean)
  }, 'CPF/CNPJ secundário inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  email_secundario: z.string().email('Email secundário inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  telefone_secundario: z.string().optional(),
})

const enderecoSchema = z.object({
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2).optional(),
})

const informacoesAdicionaisSchema = z.object({
  origem: z.string().optional(),
  campanha: z.string().optional(),
  observacoes: z.string().optional(),
})

// Schema completo para validação final
const clienteSchema = dadosPrincipaisSchema.merge(enderecoSchema).merge(informacoesAdicionaisSchema)

type ClienteFormData = z.infer<typeof clienteSchema>

interface ClienteFormProps {
  cliente?: Cliente
  mode: 'create' | 'edit'
  onSuccess?: () => void // Callback para quando a operação for bem-sucedida (usado em modals)
}

// Definição das etapas
const ETAPAS = [
  {
    id: 'dados-principais',
    titulo: 'Dados Principais',
    descricao: 'Informações básicas e documentos',
    icon: User,
    component: DadosPrincipaisStep,
  },
  {
    id: 'endereco', 
    titulo: 'Endereço',
    descricao: 'Localização e contato',
    icon: MapPin,
    component: EnderecoStep,
  },
  {
    id: 'informacoes-adicionais',
    titulo: 'Informações Adicionais', 
    descricao: 'Origem e observações',
    icon: FileText,
    component: InformacoesAdicionaisStep,
  },
]


export function ClienteForm({ cliente, mode, onSuccess }: ClienteFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  const [isValidatingCnpj, setIsValidatingCnpj] = useState(false)
  const [tipoDocumento, setTipoDocumento] = useState<'cpf' | 'cnpj'>('cpf')
  const [tipoDocumentoSecundario, setTipoDocumentoSecundario] = useState<'cpf' | 'cnpj'>('cpf')
  
  // Estados do wizard
  const [etapaAtual, setEtapaAtual] = useState(0)
  const [etapasCompletas, setEtapasCompletas] = useState<boolean[]>([false, false, false])

  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    mode: 'onBlur', // Mudança: validação apenas quando sai do campo, evita submissão automática
    defaultValues: {
      nome: cliente?.nome || '',
      nome_secundario: cliente?.nome_secundario || '',
      cpf_cnpj: cliente?.cpf_cnpj || '',
      cpf_cnpj_secundario: cliente?.cpf_cnpj_secundario || '',
      email: cliente?.email || '',
      email_secundario: cliente?.email_secundario || '',
      telefone: cliente?.telefone || '',
      telefone_secundario: cliente?.telefone_secundario || '',
      cep: cliente?.cep || '',
      endereco: cliente?.endereco || '',
      numero: cliente?.numero || '',
      complemento: cliente?.complemento || '',
      bairro: cliente?.bairro || '',
      cidade: cliente?.cidade || '',
      estado: cliente?.estado || '',
      origem: cliente?.origem || '',
      campanha: cliente?.campanha || '',
      observacoes: cliente?.observacoes || '',
    },
  })

  // Determinar tipo de documento baseado no valor
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'cpf_cnpj') {
        const clean = String(value.cpf_cnpj).replace(/\D/g, '')
        setTipoDocumento(clean.length <= 11 ? 'cpf' : 'cnpj')
      }
      if (name === 'cpf_cnpj_secundario') {
        const clean = String(value.cpf_cnpj_secundario).replace(/\D/g, '')
        setTipoDocumentoSecundario(clean.length <= 11 ? 'cpf' : 'cnpj')
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);


  // Validar etapa atual
  const validarEtapa = async (etapa: number) => {
    const dadosFormulario = form.getValues()
    let schema: z.ZodSchema
    
    switch (etapa) {
      case 0:
        schema = dadosPrincipaisSchema
        break
      case 1:
        schema = enderecoSchema
        break
      case 2:
        schema = informacoesAdicionaisSchema
        break
      default:
        return false
    }

    const result = await schema.safeParseAsync(dadosFormulario)
    if (!result.success) {
      result.error.errors.forEach((err) => {
        if (err.path.length > 0) {
          form.setError(err.path[0] as keyof ClienteFormData, {
            message: err.message
          })
        }
      })
      return false
    }
    return true
  }

  // Navegar para próxima etapa
  const proximaEtapa = async () => {
    const etapaValida = await validarEtapa(etapaAtual)
    
    if (!etapaValida) {
      toast.error('Por favor, preencha todos os campos obrigatórios')
      return
    }

    // Marcar etapa como completa
    const novasEtapasCompletas = [...etapasCompletas]
    novasEtapasCompletas[etapaAtual] = true
    setEtapasCompletas(novasEtapasCompletas)

    if (etapaAtual < ETAPAS.length - 1) {
      const proxima = etapaAtual + 1
      const tituloEtapaAnterior = ETAPAS[etapaAtual].titulo
      setEtapaAtual(proxima)
      toast.success(`${tituloEtapaAnterior} preenchido com sucesso!`)
    }
  }

  // Navegar para etapa anterior
  const etapaAnterior = () => {
    if (etapaAtual > 0) {
      setEtapaAtual(etapaAtual - 1)
    }
  }

  // Ir diretamente para uma etapa (se permitido)
  const irParaEtapa = (etapa: number) => {
    if (etapa <= etapaAtual || etapasCompletas[etapa - 1]) {
      setEtapaAtual(etapa)
    }
  }

  // Buscar endereço por CEP
  const buscarCep = async (cep: string) => {
    setIsLoadingCep(true)
    try {
      const response = await fetch(`/api/endereco/cep/${cep}`)
      if (!response.ok) {
        throw new Error('CEP não encontrado')
      }
      const data = await response.json()
      
      form.setValue('endereco', data.logradouro || '', { shouldValidate: true })
      form.setValue('bairro', data.bairro || '', { shouldValidate: true })
      form.setValue('cidade', data.localidade || '', { shouldValidate: true })
      form.setValue('estado', data.uf || '', { shouldValidate: true })
      toast.success('Endereço encontrado!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar CEP')
    } finally {
      setIsLoadingCep(false)
    }
  }

  // Buscar dados do CNPJ
  const buscarCnpj = async (cnpj: string) => {
    setIsValidatingCnpj(true)
    try {
      const response = await fetch(`/api/empresas/cnpj/${cnpj}`)
      if (!response.ok) {
        throw new Error('CNPJ não encontrado')
      }
      const data = await response.json()

      if (data && data.company) {
        form.setValue('nome', data.company.name || '', { shouldValidate: true })
        if (data.address) {
          form.setValue('cep', data.address.zip || '', { shouldValidate: true })
          form.setValue('endereco', data.address.street || '', { shouldValidate: true })
          form.setValue('numero', data.address.number || '', { shouldValidate: true })
          form.setValue('complemento', data.address.details || '', { shouldValidate: true })
          form.setValue('bairro', data.address.neighborhood || '', { shouldValidate: true })
          form.setValue('cidade', data.address.city || '', { shouldValidate: true })
          form.setValue('estado', data.address.state || '', { shouldValidate: true })
        }
        if (data.emails && data.emails.length > 0) {
          form.setValue('email', data.emails[0].address || '', { shouldValidate: true })
        }
        if (data.phones && data.phones.length > 0) {
          form.setValue('telefone', data.phones[0].number || '', { shouldValidate: true })
        }
        toast.success('Dados do CNPJ carregados!')
      }
    } catch (error) {
       // Não mostrar erro para o usuário pois a API pode ter limite de requisições ou estar offline
      console.error('Erro ao buscar CNPJ:', error)
    } finally {
      setIsValidatingCnpj(false)
    }
  }

  // Função para finalizar o cadastro - será chamada apenas pelo botão "Finalizar"
  const finalizarCadastro = async () => {
    // Validar etapa atual antes de submeter
    const etapaValida = await validarEtapa(etapaAtual)
    
    if (!etapaValida) {
      toast.error('Por favor, preencha todos os campos obrigatórios')
      return
    }

    // Marcar última etapa como completa
    const novasEtapasCompletas = [...etapasCompletas]
    novasEtapasCompletas[etapaAtual] = true
    setEtapasCompletas(novasEtapasCompletas)

    setIsLoading(true);
    try {
      const data = form.getValues()
      const endpoint = mode === 'create' ? '/api/clientes' : `/api/clientes/${cliente?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro desconhecido');

      toast.success(`Cliente ${mode === 'create' ? 'criado' : 'atualizado'} com sucesso!`);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/clientes');
        router.refresh(); // Importante para atualizar a lista de clientes
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ocorreu um erro');
    } finally {
      setIsLoading(false);
    }
  };

  // Função onSubmit do formulário - não deve fazer nada
  const onSubmit = (data: ClienteFormData) => {
    // Prevenindo submissão automática do formulário
    return;
  };

  // Calcular progresso
  const progresso = ((etapasCompletas.filter(Boolean).length) / ETAPAS.length) * 100
  
  // Extrair componentes de ícone e formulário atuais
  const IconeAtual = ETAPAS[etapaAtual].icon

  const renderCurrentStep = () => {
    switch (etapaAtual) {
      case 0:
        return (
          <DadosPrincipaisStep
            form={form}
            tipoDocumento={tipoDocumento}
            tipoDocumentoSecundario={tipoDocumentoSecundario}
            isValidatingCnpj={isValidatingCnpj}
            buscarCnpj={buscarCnpj}
          />
        )
      case 1:
        return (
          <EnderecoStep
            form={form}
            isLoadingCep={isLoadingCep}
            buscarCep={buscarCep}
          />
        )
      case 2:
        return <InformacoesAdicionaisStep form={form} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <IconeAtual className="h-5 w-5" />
                <span>{ETAPAS[etapaAtual].titulo}</span>
              </CardTitle>
              <CardDescription>{ETAPAS[etapaAtual].descricao}</CardDescription>
            </div>
            <Badge variant="outline">
              Etapa {etapaAtual + 1} de {ETAPAS.length}
            </Badge>
          </div>
          
          <div className="space-y-2 pt-4">
            <Progress value={progresso} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              {ETAPAS.map((etapa, index) => (
                <button
                  key={etapa.id}
                  onClick={() => irParaEtapa(index)}
                  className={`flex items-center space-x-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    index === etapaAtual ? 'text-primary font-medium' : 'hover:text-primary'
                  }`}
                  disabled={index > 0 && !etapasCompletas[index - 1]}
                >
                  {etapasCompletas[index] ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className={`h-4 w-4 rounded-full border-2 ${index === etapaAtual ? 'border-primary' : 'border-muted-foreground'}`} />
                  )}
                  <span>{etapa.titulo}</span>
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="min-h-[400px]">
            {renderCurrentStep()}
          </div>

          <div className="flex justify-between pt-6">
            <div className="flex space-x-2">
              {!onSuccess && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/clientes')}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              )}
              
              {etapaAtual > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={etapaAnterior}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
              )}
            </div>

            <div>
              {etapaAtual < ETAPAS.length - 1 ? (
                <Button
                  type="button"
                  onClick={proximaEtapa}
                  disabled={isLoading}
                >
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={finalizarCadastro}
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === 'create' ? 'Finalizar Cadastro' : 'Salvar Alterações'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
} 