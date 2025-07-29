import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface ProdutoImportacao {
  nome: string;
  valor: number;
  status: 'Ativo' | 'Inativo';
  categoria: string;
  reajuste: boolean;
  tem_taxa: boolean;
  erro?: string;
  valido?: boolean;
}

// Função para processar CSV
function processarCSV(content: string): ProdutoImportacao[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('Arquivo CSV vazio ou sem dados');
  }

  // Detectar separador (vírgula ou ponto e vírgula)
  const firstLine = lines[0];
  const separator = firstLine.includes(';') ? ';' : ',';
  
  const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
  const produtos: ProdutoImportacao[] = [];

  // Mapear colunas esperadas
  const colunasMapeamento: { [key: string]: string } = {
    'nome': 'nome',
    'valores': 'valor',
    'valor': 'valor',
    'status': 'status',
    'categoria': 'categoria',
    'reajuste': 'reajuste',
    'taxa de serviço': 'tem_taxa',
    'taxa de servico': 'tem_taxa',
    'taxa': 'tem_taxa'
  };

  // Encontrar índices das colunas
  const indices: { [key: string]: number } = {};
  for (const [csvCol, prodCol] of Object.entries(colunasMapeamento)) {
    const index = headers.findIndex(h => h === csvCol);
    if (index !== -1) {
      indices[prodCol] = index;
    }
  }

  // Processar linhas de dados
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map(v => v.trim());
    
    const produto: ProdutoImportacao = {
      nome: values[indices.nome] || '',
      valor: 0,
      status: 'Ativo',
      categoria: values[indices.categoria] || '',
      reajuste: false,
      tem_taxa: true,
      valido: true
    };

    // Processar valor
    if (indices.valor !== undefined) {
      if (values[indices.valor] && values[indices.valor].trim() !== '') {
        const valorStr = values[indices.valor]
          .replace('R$', '')
          .replace(/\s/g, '')
          .replace('.', '')
          .replace(',', '.');
        produto.valor = parseFloat(valorStr) || 0;
      } else {
        // Se o valor estiver vazio, usar 0
        produto.valor = 0;
      }
    }

    // Processar status
    if (indices.status !== undefined && values[indices.status]) {
      const statusLower = values[indices.status].toLowerCase();
      produto.status = statusLower === 'inativo' ? 'Inativo' : 'Ativo';
    }

    // Processar reajuste
    if (indices.reajuste !== undefined && values[indices.reajuste]) {
      const reajusteLower = values[indices.reajuste].toLowerCase();
      produto.reajuste = ['sim', 's', 'true', '1'].includes(reajusteLower);
    }

    // Processar taxa
    if (indices.tem_taxa !== undefined && values[indices.tem_taxa]) {
      const taxaLower = values[indices.tem_taxa].toLowerCase();
      produto.tem_taxa = !['não', 'nao', 'n', 'false', '0'].includes(taxaLower);
    }

    produtos.push(produto);
  }

  return produtos;
}

// Função para processar Excel
async function processarExcel(buffer: ArrayBuffer): Promise<ProdutoImportacao[]> {
  try {
    // Usar a biblioteca xlsx se estiver disponível
    const xlsx = await import('xlsx').catch(() => null);
    
    if (!xlsx) {
      throw new Error('Biblioteca XLSX não instalada. Por favor, use arquivos CSV.');
    }
    
    const workbook = xlsx.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter para JSON
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error('Arquivo Excel vazio ou sem dados');
    }
    
    // Processar headers
    const headers = (jsonData[0] as string[]).map(h => h?.toString().trim().toLowerCase() || '');
    const produtos: ProdutoImportacao[] = [];
    
    // Mapear colunas
    const colunasMapeamento: { [key: string]: string } = {
      'nome': 'nome',
      'valores': 'valor',
      'valor': 'valor',
      'status': 'status',
      'categoria': 'categoria',
      'reajuste': 'reajuste',
      'taxa de serviço': 'tem_taxa',
      'taxa de servico': 'tem_taxa',
      'taxa': 'tem_taxa'
    };
    
    const indices: { [key: string]: number } = {};
    for (const [xlsCol, prodCol] of Object.entries(colunasMapeamento)) {
      const index = headers.findIndex(h => h === xlsCol);
      if (index !== -1) {
        indices[prodCol] = index;
      }
    }
    
    // Processar linhas
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;
      
      const produto: ProdutoImportacao = {
        nome: row[indices.nome]?.toString() || '',
        valor: 0,
        status: 'Ativo',
        categoria: row[indices.categoria]?.toString() || '',
        reajuste: false,
        tem_taxa: true,
        valido: true
      };
      
      // Processar valor
      if (indices.valor !== undefined) {
        if (row[indices.valor] !== undefined && row[indices.valor] !== null && row[indices.valor].toString().trim() !== '') {
          const valorStr = row[indices.valor].toString()
            .replace('R$', '')
            .replace(/\s/g, '')
            .replace('.', '')
            .replace(',', '.');
          produto.valor = parseFloat(valorStr) || 0;
        } else {
          // Se o valor estiver vazio, usar 0
          produto.valor = 0;
        }
      }
      
      // Processar status
      if (indices.status !== undefined && row[indices.status]) {
        const statusLower = row[indices.status].toString().toLowerCase();
        produto.status = statusLower === 'inativo' ? 'Inativo' : 'Ativo';
      }
      
      // Processar reajuste
      if (indices.reajuste !== undefined && row[indices.reajuste]) {
        const reajusteLower = row[indices.reajuste].toString().toLowerCase();
        produto.reajuste = ['sim', 's', 'true', '1'].includes(reajusteLower);
      }
      
      // Processar taxa
      if (indices.tem_taxa !== undefined && row[indices.tem_taxa]) {
        const taxaLower = row[indices.tem_taxa].toString().toLowerCase();
        produto.tem_taxa = !['não', 'nao', 'n', 'false', '0'].includes(taxaLower);
      }
      
      produtos.push(produto);
    }
    
    return produtos;
  } catch (error) {
    throw new Error('Erro ao processar Excel. Por favor, use arquivos CSV.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Processar arquivo
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    let produtos: ProdutoImportacao[] = [];
    const erros: string[] = [];

    // Processar baseado no tipo de arquivo
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const text = await file.text();
      produtos = processarCSV(text);
    } else if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      produtos = await processarExcel(buffer);
    } else {
      return NextResponse.json({ error: 'Tipo de arquivo não suportado' }, { status: 400 });
    }

    // Buscar categorias válidas
    const { data: categorias } = await supabase
      .from('categorias_produtos')
      .select('id, nome')
      .eq('ativo', true);

    const categoriasMap = new Map(
      (categorias || []).map(cat => [cat.nome.toLowerCase(), cat])
    );

    // Validar produtos
    let validos = 0;
    let invalidos = 0;

    for (const produto of produtos) {
      const errosProduto: string[] = [];

      // Validar nome
      if (!produto.nome || produto.nome.trim() === '') {
        errosProduto.push('Nome é obrigatório');
      }

      // Validar valor - permitir 0 ou vazio (será convertido para 0)
      if (produto.valor < 0) {
        errosProduto.push('Valor não pode ser negativo');
      }

      // Validar categoria - permitir vazio
      if (produto.categoria && produto.categoria.trim() !== '') {
        const categoriaEncontrada = categoriasMap.get(produto.categoria.toLowerCase());
        if (!categoriaEncontrada) {
          errosProduto.push(`Categoria "${produto.categoria}" não encontrada`);
        }
      }

      // Marcar produto como válido ou inválido
      if (errosProduto.length > 0) {
        produto.valido = false;
        produto.erro = errosProduto.join(', ');
        invalidos++;
      } else {
        produto.valido = true;
        validos++;
      }
    }

    // Adicionar avisos gerais
    if (produtos.length === 0) {
      erros.push('Nenhum produto encontrado no arquivo');
    }

    if (invalidos > 0) {
      erros.push(`${invalidos} produto(s) com erro(s) de validação`);
    }

    return NextResponse.json({
      produtos,
      erros,
      validos,
      invalidos,
      total: produtos.length
    });

  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao processar arquivo' },
      { status: 500 }
    );
  }
} 