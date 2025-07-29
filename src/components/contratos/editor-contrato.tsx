'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, FileText, Save, Download, ExternalLink } from 'lucide-react';
import { ContratoTemplate, ContratoFormData, ContratoVariables } from '@/types/contrato';
import { ClienteData } from '@/components/contratos/novo-contrato';
import { criarVariaveisContrato, substituirVariaveis, formatarConteudoParaEditor } from '@/lib/contrato-utils';
import { exportContractToPDF, prepareHTMLForPDF, generatePDFAndUpload } from '@/lib/pdf-utils';
import { TiptapEditor } from '@/components/ui/tiptap-editor';

interface EditorContratoProps {
  clienteData: ClienteData | null;
  vendedor: string;
  formData: ContratoFormData;
  onFormDataChange: (data: ContratoFormData) => void;
  onSave: (conteudo: string, pdfUrl?: string) => void;
}

export function EditorContrato({ 
  clienteData, 
  vendedor, 
  formData, 
  onFormDataChange, 
  onSave 
}: EditorContratoProps) {
  const [templates, setTemplates] = useState<ContratoTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ContratoTemplate | null>(null);
  const [conteudoOriginal, setConteudoOriginal] = useState('');
  const [conteudoEditado, setConteudoEditado] = useState('');
  const [activeTab, setActiveTab] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Carregar templates disponíveis
  useEffect(() => {
    carregarTemplates();
  }, []);

  const carregarTemplates = async () => {
    try {
      // Carregar template completo
      const templateCompleto = await import('@/components/contratos/templates/modelo-eventos-completo.json');
      setTemplates([templateCompleto.default as ContratoTemplate]);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  // Gerar variáveis do contrato
  const variaveis = useMemo(() => {
    const vars = criarVariaveisContrato(clienteData, formData);
    vars.VENDEDOR = vendedor; // Usuário que gerou o contrato (não necessariamente o logado)
    return vars;
  }, [clienteData, formData, vendedor]);

  // Aplicar template selecionado
  useEffect(() => {
    if (selectedTemplate) {
      const conteudoComVariaveis = substituirVariaveis(selectedTemplate.conteudo, variaveis);
      setConteudoOriginal(conteudoComVariaveis);
      setConteudoEditado(formatarConteudoParaEditor(conteudoComVariaveis));
    }
  }, [selectedTemplate, variaveis]);

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
    onFormDataChange({ ...formData, template_id: templateId });
  };

  const handleSave = () => {
    if (conteudoEditado) {
      onSave(conteudoEditado, pdfUrl || undefined);
    }
  };

  const handleExportPDF = async () => {
    if (!conteudoEditado || !clienteData || !formData.numero_contrato) {
      alert('Preencha todos os campos obrigatórios antes de exportar');
      return;
    }

    try {
      setLoading(true);
      
      // Usar o mesmo conteúdo do preview (com cabeçalho completo)
      const result = await generatePDFAndUpload(
        formData.numero_contrato,
        clienteData.nome,
        conteudoPreview
      );
      
      if (result.success && result.url) {
        setPdfUrl(result.url);
        alert('PDF gerado e salvo com sucesso! O link está disponível para download.');
      } else {
        alert(result.error || 'Erro ao gerar PDF');
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF');
    } finally {
      setLoading(false);
    }
  };

  const conteudoPreview = useMemo(() => {
    if (!conteudoEditado) return '';
    
    // Criar o cabeçalho completo com logo e informações da empresa
    const cabecalhoHTML = `
      <div style="background-color: #27272a; padding: 2rem; margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto;">
          <img 
            src="/logos/LOGO BRANCA FUNDO TRANSP.png" 
            alt="Logo" 
            style="width: 300px; height: 120px; object-fit: contain;"
          />
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 1.125rem; margin: 0; color: rgb(255, 255, 255) !important;">Asura Kenji</div>
            <div style="font-size: 0.875rem; margin: 0; color: rgb(255, 255, 255) !important;">INDEX02 EVENTOS LTDA.</div>
            <div style="font-size: 0.875rem; margin: 0; color: rgb(255, 255, 255) !important;">30.969.797/0001-09</div>
          </div>
        </div>
      </div>
      
      <div style="padding: 0 2rem; color: #000000;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; font-size: 0.875rem; margin-bottom: 2rem;">
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Nome Completo:</span>
              <span style="flex: 1; color: #000000;">${clienteData?.nome || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">CPF/CNPJ:</span>
              <span style="flex: 1; color: #000000;">${clienteData?.cpf_cnpj || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Telefone 01:</span>
              <span style="flex: 1; color: #000000;">${clienteData?.telefone || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">E-mail 01:</span>
              <span style="flex: 1; color: #000000;">${clienteData?.email || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Rua:</span>
              <span style="flex: 1; color: #000000;">${clienteData?.endereco || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Bairro:</span>
              <span style="flex: 1; color: #000000;">${clienteData?.bairro || '-'}</span>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Nº Contrato:</span>
              <span style="flex: 1; color: #000000;">${formData.numero_contrato || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Data Contratação:</span>
              <span style="flex: 1; color: #000000;">${formData.data_contratacao ? new Date(formData.data_contratacao).toLocaleDateString('pt-BR') : '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Data do Evento:</span>
              <span style="flex: 1; color: #000000;">${formData.data_evento ? new Date(formData.data_evento).toLocaleDateString('pt-BR') : '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Local do Evento:</span>
              <span style="flex: 1; color: #000000;">${formData.local_evento || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Tipo de Evento:</span>
              <span style="flex: 1; color: #000000;">${formData.tipo_evento || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Vendedor:</span>
              <span style="flex: 1; color: #000000;">${vendedor || '-'}</span>
            </div>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 2rem; margin-top: 2rem;">
          ${conteudoEditado.replace(/\n/g, '<br>').replace(/(\d+\))/g, '<br>$1')}
        </div>
      </div>
    `;
    
    return cabecalhoHTML;
  }, [conteudoEditado, clienteData, formData, vendedor]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Editor de Contrato
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Seletor de Template */}
          <div className="space-y-2">
            <Label htmlFor="template">Modelo de Contrato</Label>
            <Select 
              value={formData.template_id} 
              onValueChange={handleTemplateChange}
              disabled={!clienteData}
            >
              <SelectTrigger>
                <SelectValue placeholder={!clienteData ? "Selecione um cliente primeiro" : "Selecione um modelo de contrato"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Informações do Contrato */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="servicos">Serviços Contratados</Label>
              <Input
                id="servicos"
                value={formData.servicos}
                onChange={(e) => onFormDataChange({ ...formData, servicos: e.target.value })}
                placeholder="Ex: Locação - Alimentação - Bebidas"
              />
            </div>
            <div>
              <Label htmlFor="numero_convidados">Número de Convidados</Label>
              <Input
                id="numero_convidados"
                type="number"
                value={formData.numero_convidados}
                onChange={(e) => onFormDataChange({ ...formData, numero_convidados: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 50"
              />
            </div>
          </div>

          {selectedTemplate && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <div className="flex gap-2">
                  <Button onClick={handleSave} variant="default">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                  <Button onClick={handleExportPDF} variant="outline" disabled={loading}>
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? 'Exportando...' : 'Gerar PDF'}
                  </Button>
                  {pdfUrl && (
                    <Button 
                      onClick={() => window.open(pdfUrl, '_blank')}
                      variant="default"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </Button>
                  )}
                </div>
              </div>

              <TabsContent value="editor" className="mt-4">
                <div className="min-h-[500px]">
                  <TiptapEditor
                    value={conteudoEditado}
                    onChange={setConteudoEditado}
                    placeholder="Digite ou edite o conteúdo do contrato aqui..."
                    className="min-h-[400px]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <Card className="bg-white overflow-hidden">
                  <div 
                    className="max-w-none"
                    dangerouslySetInnerHTML={{ __html: conteudoPreview }}
                  />
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {!selectedTemplate && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione um modelo de contrato para começar a editar</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}