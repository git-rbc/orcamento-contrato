import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('[PROFILE API] Iniciando busca de perfil')
    
    const supabase = await createServerSupabaseClient()
    
    // Verificar autenticação básica
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('[PROFILE API] Erro de autenticação:', authError)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log('[PROFILE API] Usuário autenticado:', user.email, 'ID:', user.id)

    // Lista de super admins
    const SUPER_ADMINS = ['emersonfilho953@gmail.com', 'gabrielpiffer@gmail.com']
    const isSuperAdmin = SUPER_ADMINS.includes(user.email || '')

    // Para super admins, sempre retornar perfil completo
    if (isSuperAdmin) {
      const superAdminProfile = {
        id: user.id,
        email: user.email || '',
        nome: user.user_metadata?.nome || user.email?.split('@')[0] || 'Super Admin',
        role: 'admin' as const,
        ativo: true,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role_id: null,
        role_nome: 'Super Admin',
        role_descricao: 'Administrador com acesso total ao sistema',
        role_cor: '#DC2626',
        nivel_hierarquia: 100,
        total_permissoes: 999
      }

      console.log('[PROFILE API] Retornando perfil de super admin:', superAdminProfile)
      return NextResponse.json({
        success: true,
        profile: superAdminProfile
      })
    }

    // Para outros usuários, criar perfil básico
    const basicProfile = {
      id: user.id,
      email: user.email || '',
      nome: user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário',
      role: 'vendedor' as const,
      ativo: true,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      role_id: null,
      role_nome: 'Vendedor',
      role_descricao: 'Vendedor padrão',
      role_cor: '#3B82F6',
      nivel_hierarquia: 50,
      total_permissoes: 10
    }

    console.log('[PROFILE API] Retornando perfil básico:', basicProfile)
    return NextResponse.json({
      success: true,
      profile: basicProfile
    })

  } catch (error) {
    console.error('[PROFILE API] Erro inesperado geral:', error)
    
    // Último recurso: retornar perfil mínimo válido
    return NextResponse.json({
      success: true,
      profile: {
        id: 'unknown',
        email: 'unknown@example.com',
        nome: 'Usuário',
        role: 'admin',
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role_id: null,
        role_nome: 'Admin',
        role_descricao: null,
        role_cor: '#ef4444',
        nivel_hierarquia: 90,
        total_permissoes: 0
      }
    })
  }
} 