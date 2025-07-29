'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { Settings, Package, Edit, MoreHorizontal, Info } from 'lucide-react';
import { ServicoTemplate } from '@/types/database';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditServicoModal } from '@/components/servicos/edit-servico-modal';

export default function ServicosPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const [servicos, setServicos] = useState<ServicoTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingServico, setEditingServico] = useState<ServicoTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchServicos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/servicos-template');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar serviços');
      }

      const data = await response.json();
      setServicos(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServicos();
  }, []);

  const handleToggleStatus = async (servico: ServicoTemplate) => {
    try {
      const response = await fetch(`/api/servicos-template/${servico.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ativo: !servico.ativo
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao alterar status');
      }

      toast.success(`Serviço ${!servico.ativo ? 'ativado' : 'desativado'} com sucesso!`);
      fetchServicos();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do serviço');
    }
  };

  const handleEdit = (servico: ServicoTemplate) => {
    setEditingServico(servico);
    setIsModalOpen(true);
  };

  const handleSaveEdit = async (dadosAtualizados: any) => {
    try {
      const response = await fetch(`/api/servicos-template/${editingServico?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosAtualizados),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar serviço');
      }

      toast.success('Serviço atualizado com sucesso!');
      setIsModalOpen(false);
      setEditingServico(null);
      fetchServicos();
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar serviço');
    }
  };

  const getTipoCalculoLabel = (tipo: string) => {
    const tipos = {
      'percentual_produtos': 'Percentual sobre Produtos',
      'valor_fixo_ambiente': 'Valor Fixo por Ambiente',
      'por_convidados': 'Por Número de Convidados',
      'valor_minimo_ambiente': 'Valor Mínimo por Ambiente',
      'valor_minimo_ambiente_dia': 'Valor Mínimo por Ambiente e Dia'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const getTipoCalculoColor = (tipo: string) => {
    const cores = {
      'percentual_produtos': 'bg-blue-100 text-blue-800',
      'valor_fixo_ambiente': 'bg-green-100 text-green-800',
      'por_convidados': 'bg-yellow-100 text-yellow-800',
      'valor_minimo_ambiente': 'bg-purple-100 text-purple-800',
      'valor_minimo_ambiente_dia': 'bg-orange-100 text-orange-800'
    };
    return cores[tipo as keyof typeof cores] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile) {
    router.replace('/login');
    return null;
  }

  const columns = [
    {
      key: 'nome' as keyof ServicoTemplate,
      header: 'Nome',
      sortable: true,
      className: 'w-[30%]',
      render: (value: any, servico: ServicoTemplate) => (
        <div>
          <div className="font-medium">{servico.nome}</div>
          <div className="text-sm text-muted-foreground">{servico.descricao}</div>
        </div>
      )
    },
    {
      key: 'tipo_calculo' as keyof ServicoTemplate,
      header: 'Tipo de Cálculo',
      sortable: true,
      className: 'w-[25%]',
      render: (value: any, servico: ServicoTemplate) => (
        <Badge className={getTipoCalculoColor(servico.tipo_calculo)}>
          {getTipoCalculoLabel(servico.tipo_calculo)}
        </Badge>
      )
    },
    {
      key: 'parametros' as keyof ServicoTemplate,
      header: 'Parâmetros',
      sortable: false,
      className: 'w-[20%]',
      render: (value: any, servico: ServicoTemplate) => {
        const totalParametros = servico.parametros?.length || 0;
        const parametrosAmbiente = servico.parametros?.filter(p => p.chave.startsWith('ambiente_')).length || 0;
        
        return (
          <div className="text-sm">
            <div className="text-muted-foreground">
              {totalParametros} parâmetro(s)
            </div>
            {parametrosAmbiente > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                {parametrosAmbiente} ambiente(s)
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'ativo' as keyof ServicoTemplate,
      header: 'Status',
      sortable: true,
      className: 'w-[15%]',
      render: (value: any, servico: ServicoTemplate) => (
        <div className="flex items-center space-x-2">
          <Switch
            checked={servico.ativo}
            onCheckedChange={() => handleToggleStatus(servico)}
          />
          <span className="text-sm">
            {servico.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      )
    },
    {
      key: 'acoes',
      header: 'Ações',
      sortable: false,
      className: 'w-[10%]',
      render: (value: any, servico: ServicoTemplate) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(servico)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Serviços</h1>
            <p className="text-muted-foreground">
              Configure os parâmetros dos serviços que serão utilizados nas propostas
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {servicos.length} serviço(s) configurado(s)
            </span>
          </div>
        </div>

        {/* Informações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>Informações Importantes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Tipos de Cálculo:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Percentual sobre Produtos:</strong> Calculado sobre produtos com campo específico ativado</li>
                  <li>• <strong>Valor Fixo por Ambiente:</strong> Valor fixo baseado no ambiente do evento</li>
                  <li>• <strong>Por Número de Convidados:</strong> Valor calculado pela quantidade de convidados</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Configuração:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Valor Mínimo por Ambiente:</strong> Define valor mínimo por ambiente</li>
                  <li>• <strong>Valor Mínimo por Ambiente e Dia:</strong> Considera também o dia da semana</li>
                  <li>• <strong>Status:</strong> Ative/desative serviços conforme necessário</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Serviços */}
        <Card>
          <CardHeader>
            <CardTitle>Serviços Cadastrados</CardTitle>
            <CardDescription>
              Lista de todos os serviços disponíveis para configuração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={servicos}
              columns={columns}
              loading={isLoading}
              emptyMessage="Nenhum serviço encontrado"
            />
          </CardContent>
        </Card>

        {/* Modal de Edição */}
        {editingServico && (
          <EditServicoModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingServico(null);
            }}
            servico={editingServico}
            onSave={handleSaveEdit}
          />
        )}
      </div>
    </DashboardLayout>
  );
}