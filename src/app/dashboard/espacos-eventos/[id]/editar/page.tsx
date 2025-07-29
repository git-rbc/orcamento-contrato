'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useEspacosEventos } from '@/hooks/useEspacosEventos';
import { EspacoEvento, UpdateEspacoEventoDTO, EspacoEventoLayout } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Save, Calendar } from 'lucide-react';
import Link from 'next/link';
import { LayoutsManager } from '@/components/espacos-eventos/layouts-manager';
import { toast } from 'sonner';

interface FormData {
  nome: string;
  cidade: string;
  capacidade_maxima: string;
  descricao: string;
  tem_espaco_kids: boolean;
  tem_pista_led: boolean;
  tem_centro_better: boolean;
  tipo_cadeira: string;
  tipo_decorativo: string;
  ativo: boolean;
  ordem: number;
  cor: string;
  layouts: Omit<EspacoEventoLayout, 'id' | 'espaco_id' | 'created_at' | 'updated_at'>[];
}

export default function EditarEspacoEventoPage() {
  const router = useRouter();
  const params = useParams();
  const { updateEspaco, getEspaco } = useEspacosEventos();
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [espaco, setEspaco] = useState<EspacoEvento | null>(null);
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    cidade: '',
    capacidade_maxima: '',
    descricao: '',
    tem_espaco_kids: true,
    tem_pista_led: true,
    tem_centro_better: true,
    tipo_cadeira: '',
    tipo_decorativo: '',
    ativo: true,
    ordem: 0,
    cor: '#3b82f6',
    layouts: []
  });

  const loadLayouts = useCallback(async () => {
    try {
      const response = await fetch(`/api/espacos-eventos/${params.id}/layouts`);
      if (response.ok) {
        const result = await response.json();
        setFormData(prev => ({
          ...prev,
          layouts: result.data.map((l: EspacoEventoLayout) => ({
            layout: l.layout,
            capacidade: l.capacidade,
            pavimento: l.pavimento,
            observacoes: l.observacoes
          }))
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar layouts:', error);
    }
  }, [params.id]);

  // Carregar dados do espaço
  useEffect(() => {
    const loadEspaco = async () => {
      if (typeof params.id === 'string') {
        try {
          const espacoData = await getEspaco(params.id);
          if (espacoData) {
            setEspaco(espacoData);
            setFormData({
              nome: espacoData.nome,
              cidade: espacoData.cidade,
              capacidade_maxima: espacoData.capacidade_maxima.toString(),
              descricao: espacoData.descricao || '',
              tem_espaco_kids: espacoData.tem_espaco_kids,
              tem_pista_led: espacoData.tem_pista_led,
              tem_centro_better: espacoData.tem_centro_better,
              tipo_cadeira: espacoData.tipo_cadeira || '',
              tipo_decorativo: espacoData.tipo_decorativo || '',
              ativo: espacoData.ativo,
              ordem: espacoData.ordem || 0,
              cor: espacoData.cor || '#3b82f6',
              layouts: []
            });
            
            // Carregar layouts
            await loadLayouts();
          } else {
            router.push('/dashboard/espacos-eventos');
          }
        } catch (error) {
          console.error('Erro ao carregar espaço:', error);
          router.push('/dashboard/espacos-eventos');
        }
      }
      setLoadingData(false);
    };

    loadEspaco();
  }, [params.id, getEspaco, router, loadLayouts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.cidade || !formData.capacidade_maxima) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    
    try {
      // Atualizar dados básicos
      const result = await updateEspaco(params.id as string, {
        nome: formData.nome,
        cidade: formData.cidade,
        capacidade_maxima: parseInt(formData.capacidade_maxima),
        descricao: formData.descricao,
        tem_espaco_kids: formData.tem_espaco_kids,
        tem_pista_led: formData.tem_pista_led,
        tem_centro_better: formData.tem_centro_better,
        tipo_cadeira: formData.tipo_cadeira,
        tipo_decorativo: formData.tipo_decorativo,
        ativo: formData.ativo,
        ordem: formData.ordem,
        cor: formData.cor
      });

      // Atualizar layouts
      if (result) {
        await fetch(`/api/espacos-eventos/${params.id}/layouts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ layouts: formData.layouts }),
        });
        
        toast.success('Espaço atualizado com sucesso!');
        router.push('/dashboard/espacos-eventos');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar espaço');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLayoutsChange = useCallback((layouts: Omit<EspacoEventoLayout, 'id' | 'espaco_id' | 'created_at' | 'updated_at'>[]) => {
    setFormData(prev => ({
      ...prev,
      layouts
    }));
  }, []);

  const tiposCadeira = [
    'Madeira e Ferro',
    'Madeira',
    'Beauty e Boho',
    'Ferro',
    'Plástico'
  ];

  const tiposDecorativo = [
    'Mini Beauty e Boho',
    'Beauty',
    'Beauty e Boho',
    'Rustico',
    'Moderno',
    'Clássico'
  ];

  const cidades = [
    'Itapema',
    'Nova Veneza',
    'Siderópolis',
    'Blumenau',
    'Joinville',
    'Florianópolis'
  ];

  if (loadingData) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!espaco) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Espaço não encontrado</h1>
          <p className="text-muted-foreground mt-2">
            O espaço que você está tentando editar não foi encontrado.
          </p>
          <Link href="/dashboard/espacos-eventos">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/espacos-eventos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Espaço para Eventos</h1>
          <p className="text-muted-foreground">
            Editando: <strong>{espaco.nome}</strong>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações Básicas
            </CardTitle>
            <CardDescription>
              Dados principais do espaço/ambiente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Espaço *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Salão Principal"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Select 
                  value={formData.cidade} 
                  onValueChange={(value) => handleInputChange('cidade', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {cidades.map((cidade) => (
                      <SelectItem key={cidade} value={cidade}>
                        {cidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacidade">Capacidade Máxima *</Label>
                <Input
                  id="capacidade"
                  type="number"
                  placeholder="Ex: 250"
                  min="1"
                  value={formData.capacidade_maxima}
                  onChange={(e) => handleInputChange('capacidade_maxima', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ordem">Ordem de Exibição</Label>
                <Input
                  id="ordem"
                  type="number"
                  placeholder="Ex: 10"
                  min="0"
                  value={formData.ordem || ''}
                  onChange={(e) => handleInputChange('ordem', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descrição opcional do espaço..."
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Características */}
        <Card>
          <CardHeader>
            <CardTitle>Características Disponíveis</CardTitle>
            <CardDescription>
              Marque as características que este espaço possui
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="espaco_kids"
                  checked={formData.tem_espaco_kids}
                  onCheckedChange={(checked) => handleInputChange('tem_espaco_kids', checked)}
                />
                <Label htmlFor="espaco_kids">Espaço Kids</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pista_led"
                  checked={formData.tem_pista_led}
                  onCheckedChange={(checked) => handleInputChange('tem_pista_led', checked)}
                />
                <Label htmlFor="pista_led">Pista de LED</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="centro_better"
                  checked={formData.tem_centro_better}
                  onCheckedChange={(checked) => handleInputChange('tem_centro_better', checked)}
                />
                <Label htmlFor="centro_better">Centro Better</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações Específicas</CardTitle>
            <CardDescription>
              Detalhes sobre mobiliário e decoração
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_cadeira">Tipo de Cadeira</Label>
                <Select 
                  value={formData.tipo_cadeira || undefined} 
                  onValueChange={(value) => handleInputChange('tipo_cadeira', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de cadeira" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposCadeira.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_decorativo">Tipo Decorativo</Label>
                <Select 
                  value={formData.tipo_decorativo || undefined} 
                  onValueChange={(value) => handleInputChange('tipo_decorativo', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo decorativo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposDecorativo.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cor">Cor de Identificação</Label>
                <Input
                  id="cor"
                  type="color"
                  value={formData.cor}
                  onChange={(e) => handleInputChange('cor', e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => handleInputChange('ativo', checked)}
                />
                <Label htmlFor="ativo">Espaço ativo</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gerenciador de Layouts */}
        <LayoutsManager
          espacoId={params.id as string}
          layouts={formData.layouts}
          onChange={handleLayoutsChange}
          espacoNome={formData.nome}
        />

        {/* Informações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informações do Sistema
            </CardTitle>
            <CardDescription>
              Dados de auditoria e controle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Status Atual</Label>
                <div className="mt-1">
                  <Badge variant={espaco.ativo ? 'default' : 'secondary'}>
                    {espaco.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Data de Criação</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(espaco.created_at).toLocaleString('pt-BR')}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Última Atualização</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(espaco.updated_at).toLocaleString('pt-BR')}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">ID do Sistema</Label>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  {espaco.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
          
          <Link href="/dashboard/espacos-eventos">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
} 