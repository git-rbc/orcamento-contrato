'use client';

import { useState } from 'react';

interface ContratoPublico {
  id: string;
  numero_contrato: string;
  tipo_evento: string;
  data_evento: string;
  cliente: {
    nome: string;
    email: string;
  };
}

interface ConfirmacaoAssinaturaProps {
  assinaturaId: string;
  pdfUrl: string;
  contrato: ContratoPublico;
}

export function ConfirmacaoAssinatura({ 
  assinaturaId, 
  pdfUrl, 
  contrato 
}: ConfirmacaoAssinaturaProps) {
  const [baixandoPdf, setBaixandoPdf] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleDownloadPdf = async () => {
    setBaixandoPdf(true);
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-${contrato.numero_contrato}-assinado.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      alert('Erro ao baixar o PDF. Tente novamente.');
    } finally {
      setBaixandoPdf(false);
    }
  };

  const handleAbrirPdf = () => {
    window.open(pdfUrl, '_blank');
  };

  const copiarIdAssinatura = () => {
    navigator.clipboard.writeText(assinaturaId);
    alert('ID da assinatura copiado!');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Contrato Assinado com Sucesso! 🎉
            </h2>
            <p className="text-slate-600">
              Sua assinatura digital foi processada e validada
            </p>
          </div>
        </div>

        <div className="p-6">
          {/* Informações da assinatura */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.9-2.6a9 9 0 110 5.2m-3.8-3.2a9 9 0 110 0" />
              </svg>
              Certificado de Autenticidade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-700">ID da Assinatura:</span>
                <div className="flex items-center mt-1">
                  <code className="bg-white px-2 py-1 rounded font-mono text-green-800 border border-green-300">
                    {assinaturaId}
                  </code>
                  <button
                    onClick={copiarIdAssinatura}
                    className="ml-2 text-green-600 hover:text-green-800"
                    title="Copiar ID"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <span className="font-medium text-green-700">Data/Hora:</span>
                <div className="text-green-800 mt-1">
                  {new Date().toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          </div>

          {/* Resumo do contrato */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-slate-900 mb-3">Resumo do Contrato Assinado:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="mb-2">
                  <span className="font-medium">Número:</span> {contrato.numero_contrato}
                </div>
                <div className="mb-2">
                  <span className="font-medium">Cliente:</span> {contrato.cliente.nome}
                </div>
              </div>
              <div>
                <div className="mb-2">
                  <span className="font-medium">Evento:</span> {contrato.tipo_evento}
                </div>
                <div className="mb-2">
                  <span className="font-medium">Data:</span> {formatDate(contrato.data_evento)}
                </div>
              </div>
            </div>
          </div>

          {/* Próximos passos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Próximos Passos
            </h3>
            <ul className="text-blue-700 text-sm space-y-2">
              <li className="flex items-start">
                <span className="font-bold mr-2">1.</span>
                <span>Baixe e guarde uma cópia do contrato assinado</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">2.</span>
                <span>Anote o ID da assinatura para futuras consultas</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">3.</span>
                <span>Nossa equipe entrará em contato para os próximos passos</span>
              </li>
            </ul>
          </div>

          {/* Botões de ação */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleAbrirPdf}
                className="flex items-center justify-center px-6 py-3 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Visualizar PDF
              </button>
              
              <button
                onClick={handleDownloadPdf}
                disabled={baixandoPdf}
                className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {baixandoPdf ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Baixando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Baixar PDF Assinado
                  </>
                )}
              </button>
            </div>

            {/* Informações de contato */}
            <div className="text-center pt-4 border-t border-slate-200">
              <p className="text-slate-600 text-sm mb-2">
                Dúvidas ou precisa de suporte?
              </p>
              <div className="flex items-center justify-center space-x-4 text-sm">
                <a 
                  href="mailto:contato@eventosindaia.com.br"
                  className="text-purple-600 hover:text-purple-800 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  contato@eventosindaia.com.br
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}