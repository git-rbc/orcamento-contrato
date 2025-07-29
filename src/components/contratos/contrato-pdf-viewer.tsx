'use client';

import { useMemo } from 'react';

interface ContratoData {
  id: string;
  numero_contrato: string;
  cliente_id: string;
  vendedor_id: string;
  tipo_evento: string;
  data_evento: string;
  local_evento: string;
  numero_participantes: number;
  valor_total: string;
  status: string;
  data_criacao: string;
  observacoes: string; // Contém o template preenchido
  cliente: {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    cpf_cnpj: string;
    tipo_pessoa: string;
    endereco: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    cep?: string;
  };
}

interface ContratoPdfViewerProps {
  contrato: ContratoData;
  vendedorNome?: string;
}

export function ContratoPdfViewer({ contrato, vendedorNome = '' }: ContratoPdfViewerProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const conteudoPreview = useMemo(() => {
    if (!contrato.observacoes) return '';
    
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
              <span style="flex: 1; color: #000000;">${contrato.cliente?.nome || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">CPF/CNPJ:</span>
              <span style="flex: 1; color: #000000;">${contrato.cliente?.cpf_cnpj || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Telefone 01:</span>
              <span style="flex: 1; color: #000000;">${contrato.cliente?.telefone || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">E-mail 01:</span>
              <span style="flex: 1; color: #000000;">${contrato.cliente?.email || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Rua:</span>
              <span style="flex: 1; color: #000000;">${contrato.cliente?.endereco || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Bairro:</span>
              <span style="flex: 1; color: #000000;">${contrato.cliente?.bairro || '-'}</span>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Nº Contrato:</span>
              <span style="flex: 1; color: #000000;">${contrato.numero_contrato || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Data Contratação:</span>
              <span style="flex: 1; color: #000000;">${formatDate(contrato.data_criacao)}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Data do Evento:</span>
              <span style="flex: 1; color: #000000;">${formatDate(contrato.data_evento)}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Local do Evento:</span>
              <span style="flex: 1; color: #000000;">${contrato.local_evento || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Tipo de Evento:</span>
              <span style="flex: 1; color: #000000;">${contrato.tipo_evento || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: 600; min-width: 140px; color: #000000;">Vendedor:</span>
              <span style="flex: 1; color: #000000;">${vendedorNome || '-'}</span>
            </div>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 2rem; margin-top: 2rem; line-height: 1.6;">
          ${contrato.observacoes.replace(/\n/g, '<br>').replace(/(\d+\))/g, '<br><br>$1')}
        </div>
      </div>
    `;
    
    return cabecalhoHTML;
  }, [contrato, vendedorNome]);

  return (
    <div className="bg-white">
      {/* Container para o PDF */}
      <div 
        id="contrato-pdf-content"
        className="w-full"
        style={{ 
          minHeight: '297mm', // A4 height
          backgroundColor: 'white',
          color: '#000000'
        }}
        dangerouslySetInnerHTML={{ __html: conteudoPreview }}
      />
    </div>
  );
}