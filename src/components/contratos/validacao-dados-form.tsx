'use client';

import { useState } from 'react';
import { formatarCpfCnpj } from '@/lib/assinatura-utils';

interface ValidacaoDadosFormProps {
  token: string;
  onSucesso: (dados: any) => void;
}

export function ValidacaoDadosForm({ token, onSucesso }: ValidacaoDadosFormProps) {
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/[^\d]/g, '');
    setCpfCnpj(formatarCpfCnpj(valor));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');

    try {
      const response = await fetch(`/api/contrato/publico/${token}/validar-dados`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cpf_cnpj: cpfCnpj,
          nome_completo: nomeCompleto.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || 'Erro ao validar dados');
        return;
      }

      // Sucesso na validação
      onSucesso({
        cpf_cnpj: cpfCnpj,
        nome_completo: nomeCompleto.trim(),
        ...data.dados_validados
      });
    } catch (error) {
      console.error('Erro ao validar dados:', error);
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Validação de Dados
            </h2>
            <p className="text-slate-600">
              Para prosseguir, confirme seus dados cadastrais
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="cpf_cnpj" className="block text-sm font-medium text-slate-700 mb-1">
                CPF ou CNPJ
              </label>
              <input
                type="text"
                id="cpf_cnpj"
                value={cpfCnpj}
                onChange={handleCpfCnpjChange}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                required
                maxLength={18}
              />
            </div>

            <div>
              <label htmlFor="nome_completo" className="block text-sm font-medium text-slate-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                id="nome_completo"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                placeholder="Digite seu nome completo"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                required
                minLength={3}
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 text-sm">{erro}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando || !cpfCnpj || !nomeCompleto}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {carregando ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Validando...
                </div>
              ) : (
                'Validar Dados'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-blue-700 text-sm">
                  <p className="font-semibold mb-1">Importante:</p>
                  <p>Informe seus dados para validação e acesso ao contrato.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}