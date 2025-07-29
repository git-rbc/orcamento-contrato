import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o usuário existe na nossa tabela users
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('email', email.toLowerCase())
      .single()

    if (profileError || !userProfile) {
      // Usuário não existe no nosso sistema
      return NextResponse.json({
        isFirstLogin: false,
        userExists: false
      })
    }

    // Verificar se nunca fez login usando SQL direto para acessar auth.users
    const { data: authData, error: authError } = await supabaseAdmin
      .rpc('check_user_first_login', { user_email: email.toLowerCase() })

    if (authError) {
      console.error('Erro ao verificar auth user:', authError)
      return NextResponse.json({
        isFirstLogin: false,
        userExists: true,
        role: userProfile.role
      })
    }

    // Se é admin e nunca fez login, então é primeiro login
    const isFirstLogin = userProfile.role === 'admin' && authData === true

    return NextResponse.json({
      isFirstLogin,
      userExists: true,
      role: userProfile.role
    })

  } catch (error) {
    console.error('Erro ao verificar primeiro login:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 