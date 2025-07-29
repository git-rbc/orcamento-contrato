import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const body = await request.json();
    
    // Log do webhook recebido
    await supabase
      .from('webhook_logs')
      .insert({
        provider: 'asaas',
        event_type: body.event || 'unknown',
        payload: body,
        status: 'received'
      });

    // Processar diferentes tipos de eventos do Asaas
    switch (body.event) {
      case 'PAYMENT_CONFIRMED':
        await handlePaymentConfirmed(supabase, body);
        break;
      case 'PAYMENT_RECEIVED':
        await handlePaymentReceived(supabase, body);
        break;
      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(supabase, body);
        break;
      case 'PAYMENT_DELETED':
        await handlePaymentDeleted(supabase, body);
        break;
      case 'PAYMENT_RESTORED':
        await handlePaymentRestored(supabase, body);
        break;
      default:
        console.log('Evento não tratado:', body.event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no webhook do Asaas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function handlePaymentConfirmed(supabase: any, body: any) {
  const { payment } = body;
  
  try {
    // Atualizar o pagamento na tabela payments
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('asaas_payment_id', payment.id)
      .select('user_id, plan_id');

    if (paymentError) {
      throw paymentError;
    }

    if (paymentData && paymentData.length > 0) {
      const { user_id, plan_id } = paymentData[0];
      
      // Atualizar o perfil do usuário
      await updateUserProfile(supabase, user_id, plan_id);
    }

    // Atualizar log do webhook
    await supabase
      .from('webhook_logs')
      .update({ status: 'processed' })
      .eq('payload->payment->id', payment.id)
      .eq('event_type', 'PAYMENT_CONFIRMED');

  } catch (error) {
    console.error('Erro ao processar pagamento confirmado:', error);
    
    // Atualizar log com erro
    await supabase
      .from('webhook_logs')
      .update({
        status: 'error',
        error_message: error.message
      })
      .eq('payload->payment->id', payment.id)
      .eq('event_type', 'PAYMENT_CONFIRMED');
  }
}

async function handlePaymentReceived(supabase: any, body: any) {
  // Similar ao handlePaymentConfirmed
  await handlePaymentConfirmed(supabase, body);
}

async function handlePaymentOverdue(supabase: any, body: any) {
  const { payment } = body;
  
  try {
    // Atualizar status do pagamento
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .eq('asaas_payment_id', payment.id)
      .select('user_id');

    if (paymentError) {
      throw paymentError;
    }

    if (paymentData && paymentData.length > 0) {
      const { user_id } = paymentData[0];
      
      // Desativar assinatura do usuário
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'overdue',
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id);
    }

    await supabase
      .from('webhook_logs')
      .update({ status: 'processed' })
      .eq('payload->payment->id', payment.id)
      .eq('event_type', 'PAYMENT_OVERDUE');

  } catch (error) {
    console.error('Erro ao processar pagamento em atraso:', error);
    
    await supabase
      .from('webhook_logs')
      .update({
        status: 'error',
        error_message: error.message
      })
      .eq('payload->payment->id', payment.id)
      .eq('event_type', 'PAYMENT_OVERDUE');
  }
}

async function handlePaymentDeleted(supabase: any, body: any) {
  const { payment } = body;
  
  try {
    // Atualizar status do pagamento
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('asaas_payment_id', payment.id)
      .select('user_id');

    if (paymentError) {
      throw paymentError;
    }

    if (paymentData && paymentData.length > 0) {
      const { user_id } = paymentData[0];
      
      // Cancelar assinatura do usuário
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'cancelled',
          subscription_expires_at: null,
          selected_plan_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id);
    }

    await supabase
      .from('webhook_logs')
      .update({ status: 'processed' })
      .eq('payload->payment->id', payment.id)
      .eq('event_type', 'PAYMENT_DELETED');

  } catch (error) {
    console.error('Erro ao processar pagamento cancelado:', error);
    
    await supabase
      .from('webhook_logs')
      .update({
        status: 'error',
        error_message: error.message
      })
      .eq('payload->payment->id', payment.id)
      .eq('event_type', 'PAYMENT_DELETED');
  }
}

async function handlePaymentRestored(supabase: any, body: any) {
  const { payment } = body;
  
  try {
    // Atualizar status do pagamento
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('asaas_payment_id', payment.id)
      .select('user_id, plan_id');

    if (paymentError) {
      throw paymentError;
    }

    if (paymentData && paymentData.length > 0) {
      const { user_id, plan_id } = paymentData[0];
      
      // Restaurar assinatura do usuário
      await updateUserProfile(supabase, user_id, plan_id);
    }

    await supabase
      .from('webhook_logs')
      .update({ status: 'processed' })
      .eq('payload->payment->id', payment.id)
      .eq('event_type', 'PAYMENT_RESTORED');

  } catch (error) {
    console.error('Erro ao processar pagamento restaurado:', error);
    
    await supabase
      .from('webhook_logs')
      .update({
        status: 'error',
        error_message: error.message
      })
      .eq('payload->payment->id', payment.id)
      .eq('event_type', 'PAYMENT_RESTORED');
  }
}

async function updateUserProfile(supabase: any, userId: string, planId: number) {
  // Buscar informações do plano
  const { data: planData, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) {
    throw planError;
  }

  // Calcular data de expiração baseada no plano
  const expirationDate = new Date();
  
  // Assumindo que o plano ID 1 é mensal, 2 é trimestral, 3 é semestral
  switch (planId) {
    case 1:
      expirationDate.setMonth(expirationDate.getMonth() + 1);
      break;
    case 2:
      expirationDate.setMonth(expirationDate.getMonth() + 3);
      break;
    case 3:
      expirationDate.setMonth(expirationDate.getMonth() + 6);
      break;
    default:
      expirationDate.setMonth(expirationDate.getMonth() + 1);
  }

  // Atualizar perfil do usuário
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      selected_plan_id: planId,
      subscription_expires_at: expirationDate.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (profileError) {
    throw profileError;
  }
}