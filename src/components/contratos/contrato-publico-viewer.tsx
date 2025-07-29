'use client';

import { useMemo } from 'react';

interface ContratoPublico {
  id: string;
  numero_contrato: string;
  tipo_evento: string;
  data_evento: string;
  local_evento: string;
  numero_participantes: number;
  valor_total: string;
  status: string;
  observacoes: string;
  cliente: {
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
  data_criacao: string;
}

interface ContratoPublicoViewerProps {
  contrato: ContratoPublico;
  onIniciarAssinatura: () => void;
}

export function ContratoPublicoViewer({ contrato, onIniciarAssinatura }: ContratoPublicoViewerProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value) || 0;
    return numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const conteudoContrato = useMemo(() => {
    if (!contrato.observacoes) return '';
    
    // Criar o cabeçalho completo com informações do contrato
    const cabecalhoHTML = `
      <div style="border-bottom: 3px solid #1f2937; padding: 2rem 0; margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; padding: 0 2rem;">
          <div>
            <div style="font-weight: bold; font-size: 1.8rem; margin-bottom: 0.5rem; color: #1f2937; letter-spacing: -0.025em;">INDEX02 EVENTOS LTDA.</div>
            <div style="font-size: 0.9rem; color: #4b5563; margin-bottom: 0.25rem;">CNPJ: 30.969.797/0001-09</div>
            <div style="font-size: 0.9rem; color: #4b5563;">Representante: Asura Kenji</div>
          </div>
          <div style="text-align: right; border-left: 2px solid #e5e7eb; padding-left: 2rem;">
            <div style="font-size: 0.875rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Contrato Nº</div>
            <div style="font-weight: bold; font-size: 1.5rem; color: #1f2937; margin-top: 0.25rem;">${contrato.numero_contrato}</div>
          </div>
        </div>
      </div>
      
      <div style="padding: 0 2rem; color: #000000; line-height: 1.7; font-family: 'Times New Roman', serif;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; font-size: 0.95rem; margin-bottom: 2.5rem; border: 2px solid #e5e7eb; padding: 2rem; background: #fafafa;">
          <div style="display: flex; flex-direction: column; gap: 0.875rem;">
            <h3 style="font-size: 1.1rem; font-weight: bold; margin-bottom: 1rem; color: #1f2937; text-transform: uppercase; border-bottom: 1px solid #d1d5db; padding-bottom: 0.5rem;">Dados do Contratante</h3>
            <div style="color: #374151;"><strong style="color: #1f2937;">Nome:</strong> ${contrato.cliente?.nome || '-'}</div>
            <div style="color: #374151;"><strong style="color: #1f2937;">CPF/CNPJ:</strong> ${contrato.cliente?.cpf_cnpj || '-'}</div>
            <div style="color: #374151;"><strong style="color: #1f2937;">Telefone:</strong> ${contrato.cliente?.telefone || '-'}</div>
            <div style="color: #374151;"><strong style="color: #1f2937;">E-mail:</strong> ${contrato.cliente?.email || '-'}</div>
            <div style="color: #374151;"><strong style="color: #1f2937;">Endereço:</strong> ${[
              contrato.cliente?.endereco,
              contrato.cliente?.numero,
              contrato.cliente?.bairro,
              contrato.cliente?.cidade
            ].filter(Boolean).join(', ') || '-'}</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.875rem;">
            <h3 style="font-size: 1.1rem; font-weight: bold; margin-bottom: 1rem; color: #1f2937; text-transform: uppercase; border-bottom: 1px solid #d1d5db; padding-bottom: 0.5rem;">Dados do Evento</h3>
            <div style="color: #374151;"><strong style="color: #1f2937;">Tipo:</strong> ${contrato.tipo_evento || '-'}</div>
            <div style="color: #374151;"><strong style="color: #1f2937;">Data:</strong> ${formatDate(contrato.data_evento)}</div>
            <div style="color: #374151;"><strong style="color: #1f2937;">Local:</strong> ${contrato.local_evento || '-'}</div>
            <div style="color: #374151;"><strong style="color: #1f2937;">Participantes:</strong> ${contrato.numero_participantes || '-'}</div>
            <div style="color: #374151;"><strong style="color: #1f2937;">Valor Total:</strong> ${formatCurrency(contrato.valor_total)}</div>
            <div style="color: #374151;"><strong style="color: #1f2937;">Data Contratação:</strong> ${formatDate(contrato.data_criacao)}</div>
          </div>
        </div>
        
        <div style="border-top: 3px solid #1f2937; padding-top: 2rem; margin-top: 2rem;">
          <h3 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 2rem; color: #1f2937; text-transform: uppercase; text-align: center; letter-spacing: 0.05em;">Termos e Condições do Contrato</h3>
          <div style="white-space: pre-wrap; font-size: 0.95rem; color: #374151; text-align: justify;">${contrato.observacoes.replace(/\n/g, '<br>').replace(/(\d+\))/g, '<br><br><strong style="color: #1f2937;">$1</strong>')}</div>
        </div>
        
        <div style="margin-top: 4rem; padding-top: 3rem; border-top: 3px solid #1f2937;">
          <h3 style="font-size: 1.1rem; font-weight: bold; margin-bottom: 2rem; color: #1f2937; text-transform: uppercase; text-align: center;">Assinaturas</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; margin-top: 3rem;">
            <div style="text-align: center;">
              <div style="border-bottom: 2px solid #1f2937; margin-bottom: 1rem; height: 80px; display: flex; align-items: end; justify-content: center; font-weight: 600; color: #1f2937; background: #f9fafb;">
                [ASSINATURA DA EMPRESA]
              </div>
              <div style="font-weight: bold; color: #1f2937; font-size: 1rem;">INDEX02 EVENTOS LTDA.</div>
              <div style="font-size: 0.875rem; color: #4b5563; margin-top: 0.25rem;">CNPJ: 30.969.797/0001-09</div>
              <div style="font-size: 0.875rem; color: #4b5563;">Asura Kenji</div>
              <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.75rem; text-transform: uppercase; font-weight: 600;">Contratada</div>
            </div>
            <div style="text-align: center;">
              <div style="border-bottom: 2px solid #1f2937; margin-bottom: 1rem; height: 80px; display: flex; align-items: end; justify-content: center; font-weight: 600; color: #dc2626; background: #fef2f2;">
                [AGUARDANDO ASSINATURA DIGITAL]
              </div>
              <div style="font-weight: bold; color: #1f2937; font-size: 1rem;">${contrato.cliente.nome}</div>
              <div style="font-size: 0.875rem; color: #4b5563; margin-top: 0.25rem;">${contrato.cliente.cpf_cnpj}</div>
              <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.75rem; text-transform: uppercase; font-weight: 600;">Contratante</div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    return cabecalhoHTML;
  }, [contrato]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Visualização do Contrato
              </h2>
              <p className="text-slate-600 mt-1">
                Leia atentamente todos os termos antes de assinar
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                📄 Pronto para Assinatura
              </div>
            </div>
          </div>
        </div>

        {/* Container para visualização do contrato */}
        <div 
          className="p-6 max-h-[600px] overflow-y-auto"
          style={{ 
            fontSize: '14px',
            backgroundColor: 'white',
            color: '#000000'
          }}
          dangerouslySetInnerHTML={{ __html: conteudoContrato }}
        />

        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-yellow-700 text-sm">
                <p className="font-semibold mb-1">Importante:</p>
                <p>Ao clicar em "Assinar Contrato", você estará concordando com todos os termos e condições descritos acima. A assinatura digital terá validade jurídica igual à assinatura física.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-6 py-3 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir Contrato
            </button>
            
            <button
              onClick={onIniciarAssinatura}
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Assinar Contrato
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}