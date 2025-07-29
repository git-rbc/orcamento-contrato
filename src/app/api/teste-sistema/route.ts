import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/teste-sistema - Verificar status do sistema de propostas
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar estrutura da tabela propostas
    const { data: columns } = await supabase
      .rpc('get_table_columns', { table_name: 'propostas' })
      .select();

    const hasTokenColumn = columns?.some((col: any) => col.column_name === 'token_publico');
    
    // Verificar propostas existentes
    const { data: propostas, error: propostasError } = await supabase
      .from('propostas')
      .select('id, status, clientes!inner(nome, email, email_secundario)')
      .limit(5);

    // Verificar clientes com email
    const { data: clientesComEmail, error: clientesError } = await supabase
      .from('clientes')
      .select('id, nome, email, email_secundario')
      .or('email.neq.,email_secundario.neq.')
      .limit(3);

    // Status das APIs necessárias
    const apiStatus = {
      resend_configured: !!process.env.RESEND_API_KEY,
      app_url_configured: !!process.env.NEXT_PUBLIC_APP_URL,
      token_column_exists: hasTokenColumn
    };

    return NextResponse.json({
      success: true,
      data: {
        system_status: apiStatus,
        database_structure: {
          token_publico_column: hasTokenColumn ? 'Existe' : 'FALTANDO - Precisa ser adicionada',
          total_propostas: propostas?.length || 0,
          total_clientes_email: clientesComEmail?.length || 0
        },
        sample_data: {
          propostas: propostas?.map(p => ({
            id: p.id,
            status: p.status,
            cliente: (p as any).clientes?.nome,
            email_cliente: (p as any).clientes?.email || (p as any).clientes?.email_secundario
          })) || [],
          clientes_exemplo: clientesComEmail?.map(c => ({
            id: c.id,
            nome: c.nome,
            email: c.email || c.email_secundario
          })) || []
        },
        next_steps: hasTokenColumn ? [
          'Sistema pronto para uso!',
          'Teste enviando uma proposta para um cliente',
          'Use /api/teste-email?cliente_id=ID_DO_CLIENTE para testar email'
        ] : [
          'AÇÃO NECESSÁRIA: Adicionar coluna token_publico na tabela propostas',
          'Execute no SQL Editor do Supabase:',
          'ALTER TABLE propostas ADD COLUMN token_publico VARCHAR(8) UNIQUE;',
          'CREATE INDEX idx_propostas_token_publico ON propostas(token_publico);',
          'Depois rode este teste novamente'
        ]
      }
    });

  } catch (error) {
    console.error('Erro na verificação do sistema:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}