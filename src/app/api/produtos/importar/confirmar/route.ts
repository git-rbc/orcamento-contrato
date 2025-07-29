import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface ProdutoImportacao {
  nome: string;
  valor: number;
  status: 'Ativo' | 'Inativo';
  categoria: string;
  reajuste: boolean;
  tem_taxa: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { produtos } = await request.json();
    
    if (!produtos || !Array.isArray(produtos) || produtos.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto para importar' }, { status: 400 });
    }

    // Buscar categorias para mapear nome -> id
    const { data: categorias } = await supabase
      .from('categorias_produtos')
      .select('id, nome')
      .eq('ativo', true);

    const categoriasMap = new Map(
      (categorias || []).map(cat => [cat.nome.toLowerCase(), cat])
    );

    // Buscar categoria padrão "Cerimônia ao Ar livre"
    const categoriaPadrao = categoriasMap.get('cerimônia ao ar livre');
    if (!categoriaPadrao) {
      return NextResponse.json({ 
        error: 'Categoria padrão "Cerimônia ao Ar livre" não encontrada no sistema' 
      }, { status: 500 });
    }

    // Preparar produtos para inserção
    const produtosParaInserir = [];
    
    for (const produto of produtos) {
      let categoriaId = categoriaPadrao.id;
      let categoriaNome = categoriaPadrao.nome;
      
      // Se produto tem categoria, tentar encontrar
      if (produto.categoria && produto.categoria.trim() !== '') {
        const categoria = categoriasMap.get(produto.categoria.toLowerCase());
        if (categoria) {
          categoriaId = categoria.id;
          categoriaNome = categoria.nome;
        } else {
          continue; // Pular produtos com categoria inválida (não vazia, mas não encontrada)
        }
      }
      // Se categoria está vazia, usar categoria padrão "Cerimônia ao Ar livre"

      produtosParaInserir.push({
        nome: produto.nome,
        categoria_id: categoriaId,
        categoria_nome: categoriaNome,
        status: produto.status,
        valor: produto.valor,
        tem_taxa: produto.tem_taxa,
        reajuste: produto.reajuste || false,
        descricao: null,
        observacoes: null
      });
    }

    if (produtosParaInserir.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto válido para importar' }, { status: 400 });
    }

    // Inserir produtos em lote
    const { data, error } = await supabase
      .from('produtos')
      .insert(produtosParaInserir)
      .select();

    if (error) {
      console.error('Erro ao inserir produtos:', error);
      return NextResponse.json(
        { error: 'Erro ao importar produtos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      importados: data?.length || 0,
      message: `${data?.length || 0} produtos importados com sucesso!`
    });

  } catch (error) {
    console.error('Erro ao importar produtos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 