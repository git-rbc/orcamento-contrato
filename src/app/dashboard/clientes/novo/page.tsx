'use client'

import { ClienteForm } from '@/components/clientes/cliente-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NovoClientePage() {
  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Novo Cliente</h1>
            <p className="text-muted-foreground">
              Preencha os dados para cadastrar um novo cliente
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
        <ClienteForm mode="create" />
      </div>
  )
} 