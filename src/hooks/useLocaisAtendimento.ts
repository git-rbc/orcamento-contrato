import { useState, useEffect, useCallback } from 'react';

export interface LocalAtendimento {
  id: string;
  nome: string;
  codigo: string;
  cor: string;
  tipo: 'presencial' | 'virtual' | 'treinamento';
  cidade?: string;
  endereco?: string;
  ativo: boolean;
}

export function useLocaisAtendimento() {
  const [locais, setLocais] = useState<LocalAtendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocais = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Primeiro, tentar usar uma API específica se existir
      const response = await fetch('/api/locais-atendimento');
      
      if (response.ok) {
        const data = await response.json();
        const locaisData = data.data || data || [];
        // Garantir que seja sempre um array
        setLocais(Array.isArray(locaisData) ? locaisData : []);
      } else {
        // Fallback: usar dados hardcoded dos dados reais fornecidos
        const locaisHardcoded: LocalAtendimento[] = [
          {
            id: "d5c00e0d-3469-4b2d-a3ac-8c05358c8081",
            nome: "ATEND. PESSOAL/REUN. SEMANAL",
            codigo: "APS",
            cor: "#2196F3",
            tipo: "presencial",
            ativo: true
          },
          {
            id: "5f038336-a867-4d94-b3d2-677861f09fe5",
            nome: "BLUMENAU",
            codigo: "BLU",
            cor: "#F44336",
            tipo: "presencial",
            cidade: "Blumenau",
            ativo: true
          },
          {
            id: "1390ec38-4dc7-4ccb-b939-9cd34d85234a",
            nome: "FLORIANÓPOLIS",
            codigo: "FLN",
            cor: "#9C27B0",
            tipo: "presencial",
            cidade: "Florianópolis",
            ativo: true
          },
          {
            id: "f4a59e18-bb21-40ab-a884-0bb84614d86e",
            nome: "ITAPEMA",
            codigo: "ITA",
            cor: "#FFEB3B",
            tipo: "presencial",
            cidade: "Itapema",
            ativo: true
          },
          {
            id: "66bc6d48-0817-429e-92d0-92e74afd89fb",
            nome: "JOINVILLE",
            codigo: "JOI",
            cor: "#4CAF50",
            tipo: "presencial",
            cidade: "Joinville",
            ativo: true
          },
          {
            id: "b9f88c1c-91c6-417b-8f35-bcb26fc36596",
            nome: "NOVA VENEZA",
            codigo: "NOV",
            cor: "#607D8B",
            tipo: "presencial",
            cidade: "Nova Veneza",
            ativo: true
          },
          {
            id: "9dd26eeb-cd4a-4d28-87dc-f85e26cefc89",
            nome: "ONLINE",
            codigo: "ONL",
            cor: "#FF5722",
            tipo: "virtual",
            ativo: true
          },
          {
            id: "d53f75bc-fa6a-4cbe-ac90-c377723df9a5",
            nome: "TREINAMENTO",
            codigo: "TRE",
            cor: "#424242",
            tipo: "treinamento",
            ativo: true
          }
        ];
        
        setLocais(locaisHardcoded);
      }
    } catch (err) {
      // Em caso de erro de conexão, usar dados hardcoded como fallback
      const locaisHardcoded: LocalAtendimento[] = [
        {
          id: "d5c00e0d-3469-4b2d-a3ac-8c05358c8081",
          nome: "ATEND. PESSOAL/REUN. SEMANAL",
          codigo: "APS",
          cor: "#2196F3",
          tipo: "presencial",
          ativo: true
        },
        {
          id: "5f038336-a867-4d94-b3d2-677861f09fe5",
          nome: "BLUMENAU",
          codigo: "BLU",
          cor: "#F44336",
          tipo: "presencial",
          cidade: "Blumenau",
          ativo: true
        },
        {
          id: "1390ec38-4dc7-4ccb-b939-9cd34d85234a",
          nome: "FLORIANÓPOLIS",
          codigo: "FLN",
          cor: "#9C27B0",
          tipo: "presencial",
          cidade: "Florianópolis",
          ativo: true
        },
        {
          id: "f4a59e18-bb21-40ab-a884-0bb84614d86e",
          nome: "ITAPEMA",
          codigo: "ITA",
          cor: "#FFEB3B",
          tipo: "presencial",
          cidade: "Itapema",
          ativo: true
        },
        {
          id: "66bc6d48-0817-429e-92d0-92e74afd89fb",
          nome: "JOINVILLE",
          codigo: "JOI",
          cor: "#4CAF50",
          tipo: "presencial",
          cidade: "Joinville",
          ativo: true
        },
        {
          id: "b9f88c1c-91c6-417b-8f35-bcb26fc36596",
          nome: "NOVA VENEZA",
          codigo: "NOV",
          cor: "#607D8B",
          tipo: "presencial",
          cidade: "Nova Veneza",
          ativo: true
        },
        {
          id: "9dd26eeb-cd4a-4d28-87dc-f85e26cefc89",
          nome: "ONLINE",
          codigo: "ONL",
          cor: "#FF5722",
          tipo: "virtual",
          ativo: true
        },
        {
          id: "d53f75bc-fa6a-4cbe-ac90-c377723df9a5",
          nome: "TREINAMENTO",
          codigo: "TRE",
          cor: "#424242",
          tipo: "treinamento",
          ativo: true
        }
      ];
      
      setLocais(locaisHardcoded);
      console.warn('API não disponível, usando dados hardcoded para locais de atendimento');
    } finally {
      setLoading(false);
    }
  }, []);

  // Garantir que locais seja sempre um array antes de usar filter
  const safeLocais = Array.isArray(locais) ? locais : [];
  
  // Buscar apenas locais ativos
  const locaisAtivos = safeLocais.filter(local => local.ativo);

  // Buscar apenas locais presenciais
  const locaisPresenciais = safeLocais.filter(local => local.tipo === 'presencial' && local.ativo);

  // Buscar apenas locais virtuais
  const locaisVirtuais = safeLocais.filter(local => local.tipo === 'virtual' && local.ativo);

  useEffect(() => {
    fetchLocais();
  }, [fetchLocais]);

  return {
    locais: safeLocais,
    locaisAtivos,
    locaisPresenciais,
    locaisVirtuais,
    loading,
    error,
    refetch: fetchLocais
  };
}

// Hook especializado para dropdowns/selects
export function useLocaisSelect() {
  const { locaisAtivos, loading, error } = useLocaisAtendimento();
  
  // Transformar em formato ideal para selects
  const locaisOptions = locaisAtivos.map(local => ({
    value: local.id,
    label: local.nome,
    codigo: local.codigo,
    cor: local.cor,
    tipo: local.tipo,
    cidade: local.cidade
  }));

  return {
    locaisOptions,
    loading,
    error
  };
}