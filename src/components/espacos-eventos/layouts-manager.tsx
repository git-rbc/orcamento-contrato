'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Users, 
  AlertCircle,
  Building,
  PartyPopper,
  Presentation,
  Wine,
  Church,
  Utensils,
  Trees
} from 'lucide-react';
import { LayoutTipo, EspacoEventoLayout } from '@/types/database';

interface LayoutsManagerProps {
  espacoId?: string;
  layouts: Omit<EspacoEventoLayout, 'id' | 'espaco_id' | 'created_at' | 'updated_at'>[];
  onChange: (layouts: Omit<EspacoEventoLayout, 'id' | 'espaco_id' | 'created_at' | 'updated_at'>[]) => void;
  espacoNome?: string;
}

const layoutInfo: Record<LayoutTipo, { label: string; icon: any; color: string }> = {
  'ESTILO_BALADA': { label: 'Estilo Balada', icon: PartyPopper, color: 'bg-purple-500' },
  'AUDITORIO': { label: 'Auditório', icon: Presentation, color: 'bg-blue-500' },
  'COQUETEL': { label: 'Coquetel', icon: Wine, color: 'bg-orange-500' },
  'CERIMONIA_INTERNA': { label: 'Cerimônia Interna', icon: Church, color: 'bg-pink-500' },
  'SOMENTE_JANTAR': { label: 'Somente Jantar', icon: Utensils, color: 'bg-green-500' },
  'CERIMONIA_INTERNA_EXTERNA': { label: 'Cerimônia Int. + Ext.', icon: Building, color: 'bg-indigo-500' },
  'CERIMONIA_EXTERNA': { label: 'Cerimônia Externa', icon: Trees, color: 'bg-teal-500' }
};

export function LayoutsManager({ espacoId, layouts, onChange, espacoNome }: LayoutsManagerProps) {
  const [selectedLayout, setSelectedLayout] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [pavimento, setPavimento] = useState<'INF' | 'SUP' | 'none'>('none');
  const [observacoes, setObservacoes] = useState('');

  const handleAddLayout = () => {
    if (!selectedLayout || !capacidade) return;

    const newLayout: Omit<EspacoEventoLayout, 'id' | 'espaco_id' | 'created_at' | 'updated_at'> = {
      layout: selectedLayout as LayoutTipo,
      capacidade: parseInt(capacidade),
      pavimento: pavimento && pavimento !== 'none' ? (pavimento as 'INF' | 'SUP') : null,
      observacoes: observacoes || null
    };

    // Verificar se já existe este layout/pavimento
    const exists = layouts.some(l => 
      l.layout === newLayout.layout && 
      l.pavimento === newLayout.pavimento
    );

    if (exists) {
      alert('Este layout já foi adicionado para este pavimento!');
      return;
    }

    onChange([...layouts, newLayout]);
    
    // Limpar formulário
    setSelectedLayout('');
    setCapacidade('');
    setPavimento('none');
    setObservacoes('');
  };

  const handleRemoveLayout = (index: number) => {
    const newLayouts = layouts.filter((_, i) => i !== index);
    onChange(newLayouts);
  };

  const availableLayouts = Object.keys(layoutInfo) as LayoutTipo[];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Capacidades por Layout
        </CardTitle>
        <CardDescription>
          Configure as diferentes capacidades do espaço para cada tipo de evento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário para adicionar layout */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Tipo de Layout</Label>
            <Select value={selectedLayout} onValueChange={(value) => setSelectedLayout(value as LayoutTipo | '')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o layout" />
              </SelectTrigger>
              <SelectContent>
                {availableLayouts.map((layout) => {
                  const info = layoutInfo[layout];
                  const Icon = info.icon;
                  return (
                    <SelectItem key={layout} value={layout}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {info.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Capacidade</Label>
            <Input
              type="number"
              placeholder="Ex: 250"
              value={capacidade}
              onChange={(e) => setCapacidade(e.target.value)}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label>Pavimento (opcional)</Label>
            <Select value={pavimento} onValueChange={(value) => setPavimento(value as 'INF' | 'SUP' | 'none')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="INF">Inferior</SelectItem>
                <SelectItem value="SUP">Superior</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={handleAddLayout}
              disabled={!selectedLayout || !capacidade}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Lista de layouts configurados */}
        {layouts.length > 0 && (
          <div className="space-y-2">
            <Label>Layouts Configurados</Label>
            <div className="space-y-2">
              {layouts.map((layout, index) => {
                const info = layoutInfo[layout.layout];
                const Icon = info.icon;
                
                return (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md text-white ${info.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {info.label}
                          {layout.pavimento && (
                            <Badge variant="secondary" className="text-xs">
                              {layout.pavimento}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Capacidade: {layout.capacidade} pessoas
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLayout(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {layouts.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum layout configurado ainda.</p>
            <p className="text-sm">Adicione layouts para definir diferentes capacidades.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 