'use client'

import { UseFormReturn } from 'react-hook-form'
import { Globe, Target } from 'lucide-react'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { origemOptions } from '@/lib/constants'

interface InformacoesAdicionaisStepProps {
  form: UseFormReturn<any>
}

export function InformacoesAdicionaisStep({ form }: InformacoesAdicionaisStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Origem e Campanha</CardTitle>
        <CardDescription>
          Como o cliente chegou até você
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Origem */}
          <FormField
            control={form.control}
            name="origem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origem do Cliente</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {origemOptions.map((origem) => (
                      <SelectItem key={origem.value} value={origem.value}>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          {origem.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campanha */}
          <FormField
            control={form.control}
            name="campanha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campanha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Target className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Ex: Black Friday 2024" 
                      className="pl-10"
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Nome da campanha de marketing, se aplicável
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Observações */}
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Informações adicionais sobre o cliente..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
} 