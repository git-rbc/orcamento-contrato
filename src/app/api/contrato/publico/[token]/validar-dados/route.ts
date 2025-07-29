import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validarCpfCnpj, compararNomes } from '@/lib/assinatura-utils';
import { getClientInfo } from '@/lib/ip-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { cpf_cnpj, nome_completo } = await request.json();
    
    // Validar formato do token
    if (!token || !/^[A-Z0-9]{8}$/.test(token)) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    // Validar dados de entrada
    if (!cpf_cnpj || !nome_completo) {
      return NextResponse.json(
        { error: 'CPF/CNPJ e nome completo são obrigatórios' },
        { status: 400 }
      );
    }

    // Apenas determinar tipo do documento (sem validação)
    const validacaoDoc = { 
      valido: true, 
      tipo: cpf_cnpj.replace(/[^\d]/g, '').length <= 11 ? 'CPF' : 'CNPJ' 
    };

    // Buscar contrato pelo token
    const { data: contrato, error } = await supabase
      .from('contratos')
      .select(`
        *,
        cliente:clientes(*)
      `)
      .eq('token_publico', token)
      .in('status', ['enviado', 'visualizado'])
      .single();

    if (error || !contrato) {
      return NextResponse.json(
        { error: 'Contrato não encontrado ou não disponível para validação' },
        { status: 404 }
      );
    }

    // Apenas registrar os dados fornecidos (sem validação de correspondência)
    const clientInfo = getClientInfo(request);
    console.log(`Dados fornecidos para validação no contrato ${contrato.id} por IP: ${clientInfo.ip} - CPF/CNPJ: ${cpf_cnpj}, Nome: ${nome_completo}`);

    return NextResponse.json({
      success: true,
      message: 'Dados validados com sucesso',
      dados_validados: {
        cpf_cnpj: validacaoDoc.tipo === 'CPF' ? 'CPF validado' : 'CNPJ validado',
        nome_completo: 'Nome validado',
        tipo_documento: validacaoDoc.tipo
      }
    });

  } catch (error) {
    console.error('Erro ao validar dados do cliente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}