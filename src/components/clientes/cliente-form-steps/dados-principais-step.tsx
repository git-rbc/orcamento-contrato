'use client'

import { UseFormReturn } from 'react-hook-form'
import * as z from 'zod'
import { 
  Loader2, 
  User, 
  Building, 
  FileText,
  Mail,
  Phone,
} from 'lucide-react'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCPFCNPJ, formatPhone } from '@/lib/utils'

// O schema é necessário aqui para inferir o tipo do formulário
const dadosPrincipaisSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  nome_secundario: z.string().optional(),
  cpf_cnpj: z.string(),
  cpf_cnpj_secundario: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  email_secundario: z.string().email('Email secundário inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  telefone_secundario: z.string().optional(),
})

type DadosPrincipaisFormData = z.infer<typeof dadosPrincipaisSchema>

interface DadosPrincipaisStepProps {
  form: UseFormReturn<any> // Usamos 'any' para flexibilidade, o resolver no form principal garante o tipo
  tipoDocumento: 'cpf' | 'cnpj'
  tipoDocumentoSecundario: 'cpf' | 'cnpj'
  isValidatingCnpj: boolean
  buscarCnpj: (cnpj: string) => void
}

export function DadosPrincipaisStep({ 
  form, 
  tipoDocumento, 
  tipoDocumentoSecundario,
  isValidatingCnpj,
  buscarCnpj,
}: DadosPrincipaisStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identificação</CardTitle>
        <CardDescription>
          Informações básicas do cliente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nome / Razão Social */}
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {tipoDocumento === 'cnpj' ? 'Razão Social' : 'Nome Completo'} *
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder={tipoDocumento === 'cnpj' ? 'Empresa Exemplo LTDA' : 'João da Silva'} 
                    className="pl-10"
                    {...field} 
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Nome Secundário */}
        <FormField
          control={form.control}
          name="nome_secundario"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo 2</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Nome do cônjuge ou sócio" 
                    className="pl-10"
                    {...field} 
                  />
                </div>
              </FormControl>
              <FormDescription>
                Opcional: Nome do cônjuge, sócio ou responsável secundário
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CPF/CNPJ Principal */}
        <FormField
          control={form.control}
          name="cpf_cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF/CNPJ *</FormLabel>
              <FormControl>
                <div className="relative">
                  {tipoDocumento === 'cnpj' ? (
                    <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input 
                    placeholder={tipoDocumento === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                    className="pl-10"
                    {...field}
                    onChange={(e) => {
                      const formatted = formatCPFCNPJ(e.target.value)
                      field.onChange(formatted)
                      
                      // Se for CNPJ completo, buscar dados
                      const clean = formatted.replace(/\D/g, '')
                      if (clean.length === 14) {
                        buscarCnpj(clean)
                      }
                    }}
                  />
                  {isValidatingCnpj && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CPF/CNPJ Secundário */}
        <FormField
          control={form.control}
          name="cpf_cnpj_secundario"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF/CNPJ 02</FormLabel>
              <FormControl>
                <div className="relative">
                  {tipoDocumentoSecundario === 'cnpj' ? (
                    <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input 
                    placeholder={tipoDocumentoSecundario === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                    className="pl-10"
                    {...field}
                    onChange={(e) => {
                      const formatted = formatCPFCNPJ(e.target.value)
                      field.onChange(formatted)
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Opcional: CPF/CNPJ do cônjuge ou sócio
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Emails e Telefones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email Principal */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail 01</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="email"
                      placeholder="email@exemplo.com" 
                      className="pl-10"
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Telefone Principal */}
          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone 01</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="(00) 00000-0000" 
                      className="pl-10"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value)
                        field.onChange(formatted)
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email Secundário */}
          <FormField
            control={form.control}
            name="email_secundario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail 02</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="email"
                      placeholder="email2@exemplo.com" 
                      className="pl-10"
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Telefone Secundário */}
          <FormField
            control={form.control}
            name="telefone_secundario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone 02</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="(00) 00000-0000" 
                      className="pl-10"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value)
                        field.onChange(formatted)
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
} 