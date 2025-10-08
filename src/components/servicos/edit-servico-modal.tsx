'use client';

import { useState, useEffect } from 'react';
import { ServicoTemplate } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, X, Settings, Percent, Users, MapPin, DollarSign, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EditServicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  servico: ServicoTemplate;
  onSave: (dados: any) => void;
}

interface EspacoEvento {
  id: string;
  nome: string;
  cidade: string;
  ativo: boolean;
}

interface ValorFixoAmbienteFormProps {
  servico: ServicoTemplate;
  formData: any;
  onParametroChange: (chave: string, valor: string) => void;
}

function ValorFixoAmbienteForm({ servico, formData, onParametroChange }: ValorFixoAmbienteFormProps) {
  const [espacos, setEspacos] = useState<EspacoEvento[]>([]);
  const [isLoadingEspacos, setIsLoadingEspacos] = useState(true);

  useEffect(() => {
    const fetchEspacos = async () => {
      try {
        setIsLoadingEspacos(true);
        // Buscar todos os espaços ativos sem paginação
        const response = await fetch('/api/espacos-eventos/all');
        if (response.ok) {
          const data = await response.json();
          setEspacos(data.data || []);
        } else {
          console.error('Erro na API:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Erro ao carregar espaços:', error);
      } finally {
        setIsLoadingEspacos(false);
      }
    };

    fetchEspacos();
  }, []);

  if (isLoadingEspacos) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isEstacionamento = servico.nome === 'Tx. Estacionamento';
  const titulo = isEstacionamento ? 'Valor por Ambiente' : 'Valor Mínimo por Ambiente';
  const descricao = isEstacionamento 
    ? 'Configure o valor fixo do estacionamento para cada ambiente de evento'
    : 'Configure o valor mínimo para cada ambiente de evento';
  const dica = isEstacionamento
    ? 'Deixe em branco os ambientes que não cobram estacionamento'
    : 'Deixe em branco os ambientes que não têm valor mínimo';

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">{titulo}</h4>
        <p className="text-sm text-blue-700">
          {descricao} ({espacos.length} ambientes)
        </p>
        <p className="text-xs text-blue-600 mt-1">
          💡 {dica}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {espacos
          .sort((a, b) => a.cidade.localeCompare(b.cidade) || a.nome.localeCompare(b.nome))
          .map((espaco) => (
            <div key={espaco.id} className="border rounded-lg p-4">
              <Label htmlFor={`ambiente_${espaco.id}`} className="text-sm font-medium">
                {espaco.nome}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">{espaco.cidade}</p>
              <div className="flex items-center space-x-2">
                <span className="text-sm">R$</span>
                <Input
                  id={`ambiente_${espaco.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.parametros[`ambiente_${espaco.id}`] || ''}
                  onChange={(e) => onParametroChange(`ambiente_${espaco.id}`, e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-white text-black"
                />
              </div>
            </div>
          ))}
      </div>
      
      {espacos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhum espaço de evento ativo encontrado</p>
        </div>
      )}
    </div>
  );
}

function ReajusteTemporalForm({ servico, formData, onParametroChange }: ValorFixoAmbienteFormProps) {
  const faixasReajuste = [
    { key: 'faixa_0_5', label: '0 a 5 meses' },
    { key: 'faixa_6_12', label: '6 a 12 meses' },
    { key: 'faixa_13_24', label: '13 a 24 meses' },
    { key: 'faixa_25_36', label: '25 a 36 meses' },
    { key: 'faixa_37_48', label: '37 a 48 meses' },
    { key: 'faixa_49_60', label: '49 a 60 meses' },
    { key: 'faixa_61_72', label: '61 a 72 meses' },
    { key: 'faixa_73_84', label: '73 a 84 meses' },
    { key: 'faixa_85_96', label: '85 a 96 meses' },
    { key: 'faixa_97_108', label: '97 a 108 meses' },
    { key: 'faixa_109_120', label: '109 a 120 meses' },
    { key: 'faixa_121_132', label: '121 a 132 meses' }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">Reajuste Temporal por Faixa de Meses</h4>
        <p className="text-sm text-blue-700">
          Configure o percentual de reajuste baseado no tempo entre a data de contratação e data de realização
        </p>
        <p className="text-xs text-blue-600 mt-1">
          💡 Configure os percentuais para cada faixa de meses (deixe 0 para sem reajuste)
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="campo_produto">Campo do Produto</Label>
          <Input
            id="campo_produto"
            value={formData.parametros.campo_produto || 'reajuste'}
            onChange={(e) => onParametroChange('campo_produto', e.target.value)}
            placeholder="reajuste"
            readOnly
          />
          <p className="text-sm text-muted-foreground mt-1">
            Campo da tabela produtos que identifica quais produtos sofrem reajuste
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-4 font-medium text-gray-900 border-b min-w-[200px]">
                    Faixa de Meses
                  </th>
                  <th className="text-center py-2 px-4 font-medium text-gray-900 border-b min-w-[150px]">
                    Percentual (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {faixasReajuste.map((faixa, index) => (
                  <tr key={faixa.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 border-b">
                      <div className="font-medium text-gray-900">{faixa.label}</div>
                    </td>
                    <td className="py-3 px-4 border-b text-center">
                      <div className="flex items-center justify-center">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.parametros[faixa.key] || '0'}
                          onChange={(e) => onParametroChange(faixa.key, e.target.value)}
                          placeholder="0.00"
                          className="w-20 text-center text-sm bg-white text-black"
                        />
                        <span className="ml-1 text-sm text-gray-500">%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValorMinimoAmbienteDiaForm({ servico, formData, onParametroChange }: ValorFixoAmbienteFormProps) {
  const [espacos, setEspacos] = useState<EspacoEvento[]>([]);
  const [isLoadingEspacos, setIsLoadingEspacos] = useState(true);

  const diasSemana = [
    { key: 'segunda_quinta', label: 'Seg/Qui', fullLabel: 'Segunda a Quinta' },
    { key: 'sexta', label: 'Sex', fullLabel: 'Sexta' },
    { key: 'sabado', label: 'Sáb', fullLabel: 'Sábado' },
    { key: 'domingo', label: 'Dom', fullLabel: 'Domingo' },
    { key: 'vesperas', label: 'Vésperas', fullLabel: 'Vésperas' },
    { key: 'feriados', label: 'Feriados', fullLabel: 'Feriados' }
  ];

  useEffect(() => {
    const fetchEspacos = async () => {
      try {
        setIsLoadingEspacos(true);
        const response = await fetch('/api/espacos-eventos/all');
        if (response.ok) {
          const data = await response.json();
          setEspacos(data.data || []);
        } else {
          console.error('Erro na API:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Erro ao carregar espaços:', error);
      } finally {
        setIsLoadingEspacos(false);
      }
    };

    fetchEspacos();
  }, []);

  if (isLoadingEspacos) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">Valor Mínimo por Ambiente e Dia da Semana</h4>
        <p className="text-sm text-blue-700">
          Configure o valor mínimo de locação para cada ambiente por dia da semana ({espacos.length} ambientes)
        </p>
        <p className="text-xs text-blue-600 mt-1">
          💡 Deixe em branco os campos que não têm valor mínimo definido
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-gray-900 border-b sticky left-0 bg-gray-50 z-10 min-w-[140px]">
                  Cidade
                </th>
                {diasSemana.map((dia) => (
                  <th key={dia.key} className="text-center py-2 px-2 font-medium text-gray-900 border-b min-w-[90px]">
                    {dia.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {espacos
                .sort((a, b) => a.cidade.localeCompare(b.cidade) || a.nome.localeCompare(b.nome))
                .map((espaco, index) => (
                  <tr key={espaco.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-3 border-b sticky left-0 bg-inherit z-10 min-w-[140px]">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{espaco.cidade}</div>
                        <div className="text-xs text-gray-500">{espaco.nome}</div>
                      </div>
                    </td>
                    {diasSemana.map((dia) => (
                      <td key={dia.key} className="py-2 px-1 border-b text-center min-w-[90px]">
                        <div className="flex items-center justify-center">
                          <span className="text-xs text-gray-500 mr-1">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.parametros[`ambiente_${espaco.id}_${dia.key}`] || ''}
                            onChange={(e) => onParametroChange(`ambiente_${espaco.id}_${dia.key}`, e.target.value)}
                            placeholder="0.00"
                            className="w-16 h-7 text-xs text-center border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-black"
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {espacos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhum espaço de evento ativo encontrado</p>
        </div>
      )}
    </div>
  );
}

export function EditServicoModal({ isOpen, onClose, servico, onSave }: EditServicoModalProps) {
  const [formData, setFormData] = useState({
    nome: servico.nome,
    descricao: servico.descricao || '',
    para_reajuste: servico.para_reajuste || false,
    parametros: {} as Record<string, string>
  });

  useEffect(() => {
    // Inicializar parâmetros do serviço
    const parametrosObj: Record<string, string> = {};
    servico.parametros?.forEach(param => {
      parametrosObj[param.chave] = param.valor;
    });
    
    setFormData({
      nome: servico.nome,
      descricao: servico.descricao || '',
      para_reajuste: servico.para_reajuste || false,
      parametros: parametrosObj
    });
  }, [servico]);

  const handleParametroChange = (chave: string, valor: string) => {
    setFormData(prev => ({
      ...prev,
      parametros: {
        ...prev.parametros,
        [chave]: valor
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Converter parâmetros para o formato esperado pela API
    const parametrosArray = Object.entries(formData.parametros).map(([chave, valor]) => ({
      chave,
      valor,
      tipo_dado: getParametroTipoDado(chave)
    }));

    const dadosParaEnviar = {
      nome: formData.nome,
      descricao: formData.descricao,
      para_reajuste: formData.para_reajuste,
      parametros: parametrosArray
    };

    onSave(dadosParaEnviar);
  };

  const getParametroTipoDado = (chave: string): 'number' | 'text' | 'boolean' => {
    const tiposNumber = ['percentual', 'valor_fixo', 'convidados_quantidade', 'valor_por_grupo', 'valor_minimo'];
    const tiposText = ['campo_produto'];
    
    if (tiposNumber.includes(chave)) return 'number';
    if (tiposText.includes(chave)) return 'text';
    if (chave.startsWith('ambiente_')) return 'number'; // Parâmetros de ambiente
    if (chave.startsWith('faixa_')) return 'number'; // Parâmetros de faixa temporal
    return 'text';
  };

  const getTipoCalculoInfo = (tipo: string) => {
    const infos = {
      'percentual_produtos': {
        icon: <Percent className="h-4 w-4" />,
        title: 'Percentual sobre Produtos',
        description: 'Valor calculado como percentual sobre produtos com campo específico ativado'
      },
      'valor_fixo_ambiente': {
        icon: <MapPin className="h-4 w-4" />,
        title: 'Valor Fixo por Ambiente',
        description: 'Valor fixo baseado no ambiente do evento'
      },
      'por_convidados': {
        icon: <Users className="h-4 w-4" />,
        title: 'Por Número de Convidados',
        description: 'Valor calculado pela quantidade de convidados'
      },
      'valor_minimo_ambiente': {
        icon: <DollarSign className="h-4 w-4" />,
        title: 'Valor Mínimo por Ambiente',
        description: 'Define valor mínimo baseado no ambiente'
      },
      'valor_minimo_ambiente_dia': {
        icon: <Calendar className="h-4 w-4" />,
        title: 'Valor Mínimo por Ambiente e Dia',
        description: 'Valor mínimo considerando ambiente e dia da semana'
      },
      'reajuste_temporal': {
        icon: <Calendar className="h-4 w-4" />,
        title: 'Reajuste Temporal',
        description: 'Reajuste baseado na diferença entre data de contratação e data de realização'
      }
    };
    return infos[tipo as keyof typeof infos] || infos.percentual_produtos;
  };

  const renderParametroForm = () => {
    const info = getTipoCalculoInfo(servico.tipo_calculo);
    
    switch (servico.tipo_calculo) {
      case 'percentual_produtos':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="percentual">Percentual (%)</Label>
              <Input
                id="percentual"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.parametros.percentual || '0'}
                onChange={(e) => handleParametroChange('percentual', e.target.value)}
                placeholder="Ex: 10.5"
                className="bg-white text-black"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Percentual que será aplicado sobre os produtos
              </p>
            </div>
            <div>
              <Label htmlFor="campo_produto">Campo do Produto</Label>
              <Input
                id="campo_produto"
                value={formData.parametros.campo_produto || ''}
                onChange={(e) => handleParametroChange('campo_produto', e.target.value)}
                placeholder="Ex: tem_taxa"
                readOnly
              />
              <p className="text-sm text-muted-foreground mt-1">
                Campo da tabela produtos que identifica quais produtos devem ser incluídos no cálculo
              </p>
              <div className="mt-2 p-2 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Cálculo:</strong> Percentual aplicado sobre a soma dos valores dos produtos onde <code>{formData.parametros.campo_produto || 'campo'} = true</code>
                </p>
                {servico.nome === 'Equipe (Taxa de Serviço)' && (
                  <p className="text-xs text-blue-600 mt-1">
                    Ex: Se há R$ 1.000 em produtos com tem_taxa=true e percentual=10%, o valor será R$ 100
                  </p>
                )}
                {servico.nome === 'Reajuste' && (
                  <p className="text-xs text-blue-600 mt-1">
                    Ex: Se há R$ 500 em produtos com reajuste=true e percentual=5%, o valor será R$ 25
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'valor_fixo_ambiente':
        return <ValorFixoAmbienteForm servico={servico} formData={formData} onParametroChange={handleParametroChange} />;

      case 'por_convidados':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="convidados_quantidade">Quantidade de Convidados</Label>
              <Input
                id="convidados_quantidade"
                type="number"
                min="1"
                value={formData.parametros.convidados_quantidade || '100'}
                onChange={(e) => handleParametroChange('convidados_quantidade', e.target.value)}
                placeholder="Ex: 100"
                className="bg-white text-black"
              />
              <p className="text-sm text-muted-foreground mt-1">
                A cada X convidados
              </p>
            </div>
            <div>
              <Label htmlFor="valor_por_grupo">Valor por Grupo (R$)</Label>
              <Input
                id="valor_por_grupo"
                type="number"
                step="0.01"
                min="0"
                value={formData.parametros.valor_por_grupo || '200'}
                onChange={(e) => handleParametroChange('valor_por_grupo', e.target.value)}
                placeholder="Ex: 200.00"
                className="bg-white text-black"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Valor cobrado por grupo de convidados
              </p>
            </div>
          </div>
        );

      case 'valor_minimo_ambiente':
        return <ValorFixoAmbienteForm servico={servico} formData={formData} onParametroChange={handleParametroChange} />;
      
      case 'valor_minimo_ambiente_dia':
        return <ValorMinimoAmbienteDiaForm servico={servico} formData={formData} onParametroChange={handleParametroChange} />;
      
      case 'reajuste_temporal':
        return <ReajusteTemporalForm servico={servico} formData={formData} onParametroChange={handleParametroChange} />;

      default:
        return (
          <div className="text-center py-4 text-muted-foreground">
            <p>Tipo de cálculo não reconhecido</p>
          </div>
        );
    }
  };

  const info = getTipoCalculoInfo(servico.tipo_calculo);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[98vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Editar Serviço</span>
          </DialogTitle>
          <DialogDescription>
            Configure os parâmetros do serviço {servico.nome}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Serviço</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do serviço"
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva como este serviço funciona"
                  rows={3}
                />
              </div>

              {servico.nome === 'Equipe (Taxa de Serviço)' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="para_reajuste"
                    checked={formData.para_reajuste}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, para_reajuste: checked as boolean }))
                    }
                  />
                  <div>
                    <Label htmlFor="para_reajuste" className="font-medium">
                      Reajuste
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Quando marcado, a taxa de serviço será calculada também sobre produtos marcados para reajuste
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tipo de Cálculo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {info.icon}
                <span>Tipo de Cálculo</span>
              </CardTitle>
              <CardDescription>
                {info.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="mb-4">
                {info.title}
              </Badge>
              {renderParametroForm()}
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t sticky bottom-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}