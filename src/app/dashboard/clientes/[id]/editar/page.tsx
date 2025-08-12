'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ClienteForm } from '@/components/clientes/cliente-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Cliente } from '@/types/database'
import { toast } from 'sonner'

export default function EditarClientePage() {
  const params = useParams()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCliente = async () => {
      try {
        const response = await fetch(`/api/clientes/${params.id}`)
        if (!response.ok) {
          throw new Error('Cliente não encontrado')
        }
        const data = await response.json()
        setCliente(data.data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar cliente')
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchCliente()
    }
  }, [params.id])

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  if (!cliente) {
    return (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Cliente não encontrado</h1>
            <p className="text-muted-foreground mt-2">
              O cliente que você está procurando não existe ou foi removido.
            </p>
            <Link href="/dashboard/clientes">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Clientes
              </Button>
            </Link>
          </div>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Editar Cliente</h1>
            <p className="text-muted-foreground">
              Atualize os dados do cliente
            </p>
          </div>
          <Link href="/dashboard/clientes">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>

        {/* Formulário */}
        <ClienteForm mode="edit" cliente={cliente} />
      </div>
  )
} 