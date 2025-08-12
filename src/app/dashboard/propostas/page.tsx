'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter } from 'lucide-react';
import { useState, lazy, Suspense } from 'react';

// Import dinâmico para reduzir bundle inicial
const PropostaModal = lazy(() => import('@/components/propostas/proposta-modal').then(mod => ({ default: mod.PropostaModal })));
const PropostasList = lazy(() => import('@/components/propostas/propostas-list').then(mod => ({ default: mod.PropostasList })));
const PropostasSearchModal = lazy(() => import('@/components/propostas/propostas-search-modal').then(mod => ({ default: mod.PropostasSearchModal })));

export default function PropostasPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editandoPropostaId, setEditandoPropostaId] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [filtros, setFiltros] = useState<any>({});

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

  const handleEditarProposta = (propostaId: string) => {
    setEditandoPropostaId(propostaId);
    setOpen(true);
  };

  const handleCloseModal = () => {
    setOpen(false);
    setEditandoPropostaId(null);
  };

  const handleApplyFilters = (newFiltros: any) => {
    setFiltros(newFiltros);
    setSearchModalOpen(false);
  };

  const handleClearFilters = () => {
    setFiltros({});
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Propostas</h1>
            <p className="text-muted-foreground">
              Gerencie as propostas comerciais e crie novas quando necessário
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Gerar Proposta
          </Button>
        </div>

        {/* Tabs para filtrar propostas */}
        <Tabs defaultValue="todas" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="rascunho">Rascunho</TabsTrigger>
            <TabsTrigger value="enviada">Enviadas</TabsTrigger>
            <TabsTrigger value="aceita">Aceitas</TabsTrigger>
            <TabsTrigger value="recusada">Recusadas</TabsTrigger>
            <TabsTrigger value="convertida">Convertidas</TabsTrigger>
          </TabsList>

          {/* Cabeçalho com colunas e filtros */}
          <div className="mt-6 space-y-4">
            {/* Barra de ferramentas */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSearchModalOpen(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Pesquisa Avançada
                </Button>
                
                {Object.keys(filtros).length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleClearFilters}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Limpar Filtros ({Object.keys(filtros).length})
                  </Button>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                {Object.keys(filtros).length > 0 && 
                  `Filtros ativos: ${Object.keys(filtros).filter(key => filtros[key]).length}`
                }
              </div>
            </div>

            {/* Cabeçalho das colunas */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                <div className="col-span-3">Cliente</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Data</div>
                <div className="col-span-1">Pessoas</div>
                <div className="col-span-2">Local</div>
                <div className="col-span-2">Vendedor</div>
                <div className="col-span-1">Valor</div>
                <div className="col-span-1">Ações</div>
              </div>
            </div>
          </div>
          
          <TabsContent value="todas" className="mt-4">
            <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>}>
              <PropostasList onEditarProposta={handleEditarProposta} filtros={filtros} />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="rascunho" className="mt-4">
            <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>}>
              <PropostasList filtroStatus="rascunho" onEditarProposta={handleEditarProposta} filtros={filtros} />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="enviada" className="mt-4">
            <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>}>
              <PropostasList filtroStatus="enviada" onEditarProposta={handleEditarProposta} filtros={filtros} />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="aceita" className="mt-4">
            <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>}>
              <PropostasList filtroStatus="aceita" onEditarProposta={handleEditarProposta} filtros={filtros} />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="recusada" className="mt-4">
            <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>}>
              <PropostasList filtroStatus="recusada" onEditarProposta={handleEditarProposta} filtros={filtros} />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="convertida" className="mt-4">
            <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>}>
              <PropostasList filtroStatus="convertida" onEditarProposta={handleEditarProposta} filtros={filtros} />
            </Suspense>
          </TabsContent>
        </Tabs>

        <Suspense fallback={null}>
          <PropostaModal 
            open={open} 
            onOpenChange={handleCloseModal}
            propostaId={editandoPropostaId}
          />
        </Suspense>

        <Suspense fallback={null}>
          <PropostasSearchModal
            open={searchModalOpen}
            onOpenChange={setSearchModalOpen}
            onApplyFilters={handleApplyFilters}
            currentFilters={filtros}
          />
        </Suspense>
      </div>
  );
} 