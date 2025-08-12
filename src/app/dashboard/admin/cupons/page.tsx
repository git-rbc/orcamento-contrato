'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { CupomModal } from '@/components/cupons/cupom-modal';
import { CupomDesconto } from '@/types/database';
import { toast } from 'sonner';

export default function CuponsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [cupons, setCupons] = useState<CupomDesconto[]>([]);
  const [loading, setLoading] = useState(true);
  const [cupomEditando, setCupomEditando] = useState<CupomDesconto | undefined>(undefined);

  // Buscar cupons
  const fetchCupons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cupons');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar cupons');
      }

      const data = await response.json();
      setCupons(data);
    } catch (error) {
      console.error('Erro ao buscar cupons:', error);
      toast.error('Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCupons();
  }, []);

  const handleEditCupom = (cupom: CupomDesconto) => {
    setCupomEditando(cupom);
    setModalOpen(true);
  };

  const handleDeleteCupom = async (cupom: CupomDesconto) => {
    if (!confirm(`Tem certeza que deseja excluir o cupom "${cupom.codigo}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/cupons/${cupom.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir cupom');
      }

      toast.success('Cupom excluído com sucesso!');
      fetchCupons(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
      toast.error('Erro ao excluir cupom');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setCupomEditando(undefined);
    fetchCupons(); // Recarregar lista após criar/editar
  };

  const formatarValorDesconto = (cupom: CupomDesconto) => {
    if (cupom.tipo_desconto === 'percentual') {
      return `${cupom.valor_desconto}%`;
    } else {
      return cupom.valor_desconto.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    }
  };

  const getStatusBadge = (cupom: CupomDesconto) => {
    if (!cupom.ativo) {
      return <Badge variant="secondary">Inativo</Badge>;
    }

    const hoje = new Date();
    const dataFim = cupom.data_fim ? new Date(cupom.data_fim) : null;
    const dataInicio = cupom.data_inicio ? new Date(cupom.data_inicio) : null;

    if (dataInicio && dataInicio > hoje) {
      return <Badge variant="outline">Agendado</Badge>;
    }

    if (dataFim && dataFim < hoje) {
      return <Badge variant="destructive">Expirado</Badge>;
    }

    if (cupom.limite_uso && cupom.uso_atual >= cupom.limite_uso) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }

    return <Badge variant="default">Ativo</Badge>;
  };

  return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cupons de Desconto</h1>
            <p className="text-muted-foreground">
              Gerencie cupons e promoções para aplicar em propostas
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar Cupom
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cupons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cupons.map((cupom) => (
              <Card key={cupom.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-lg">{cupom.codigo}</CardTitle>
                    </div>
                    {getStatusBadge(cupom)}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {cupom.nome}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Desconto:</span>
                    <span className="font-medium text-green-600">
                      {formatarValorDesconto(cupom)}
                    </span>
                  </div>

                  {cupom.valor_minimo_pedido && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Valor mínimo:</span>
                      <span className="text-sm">
                        {cupom.valor_minimo_pedido.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </span>
                    </div>
                  )}

                  {cupom.limite_uso && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Uso:</span>
                      <span className="text-sm">
                        {cupom.uso_atual}/{cupom.limite_uso}
                      </span>
                    </div>
                  )}

                  {cupom.cliente_especifico && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Cliente:</span>
                      <span className="text-sm font-medium">
                        {cupom.cliente_especifico.nome}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Nível:</span>
                    <Badge variant={cupom.nivel_acesso === 'admin' ? 'default' : 'secondary'}>
                      {cupom.nivel_acesso === 'admin' ? 'Admin' : 'Vendedor'}
                    </Badge>
                  </div>

                  {(cupom.data_inicio || cupom.data_fim) && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      {cupom.data_inicio && cupom.data_fim ? (
                        <>Válido: {new Date(cupom.data_inicio).toLocaleDateString('pt-BR')} - {new Date(cupom.data_fim).toLocaleDateString('pt-BR')}</>
                      ) : cupom.data_inicio ? (
                        <>Válido a partir de: {new Date(cupom.data_inicio).toLocaleDateString('pt-BR')}</>
                      ) : cupom.data_fim ? (
                        <>Válido até: {new Date(cupom.data_fim).toLocaleDateString('pt-BR')}</>
                      ) : null}
                    </div>
                  )}

                  <div className="flex space-x-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCupom(cupom)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCupom(cupom)}
                      className="flex-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum cupom cadastrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece criando seu primeiro cupom de desconto para usar nas propostas.
              </p>
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeiro Cupom
              </Button>
            </CardContent>
          </Card>
        )}

        <CupomModal 
          open={modalOpen} 
          onOpenChange={handleModalClose}
          cupom={cupomEditando}
        />
      </div>
  );
}