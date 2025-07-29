import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Lista de super admins que têm acesso total automático
const SUPER_ADMINS = [
  'emersonfilho953@gmail.com',
  'gabrielpiffer@gmail.com'
];

// Menus básicos padrão
const DEFAULT_MENUS = [
  {
    id: 'dashboard',
    nome: 'Dashboard',
    slug: 'dashboard',
    icone: 'Home',
    url: '/dashboard',
    ordem: 10,
    ativo: true,
    parent_id: null,
    children: []
  },
  {
    id: 'clientes',
    nome: 'Clientes',
    slug: 'clientes',
    icone: 'Users',
    url: '/dashboard/clientes',
    ordem: 20,
    ativo: true,
    parent_id: null,
    children: []
  }
];

// Todos os menus para super admins
const ALL_MENUS = [
  {
    id: 'dashboard',
    nome: 'Dashboard',
    slug: 'dashboard',
    icone: 'Home',
    url: '/dashboard',
    ordem: 10,
    ativo: true,
    parent_id: null,
    children: []
  },
  {
    id: 'clientes',
    nome: 'Clientes',
    slug: 'clientes',
    icone: 'Users',
    url: '/dashboard/clientes',
    ordem: 20,
    ativo: true,
    parent_id: null,
    children: []
  },
  {
    id: 'servicos',
    nome: 'Serviços',
    slug: 'servicos',
    icone: 'Package',
    url: '/dashboard/servicos',
    ordem: 30,
    ativo: true,
    parent_id: null,
    children: []
  },
  {
    id: 'produtos',
    nome: 'Produtos',
    slug: 'produtos',
    icone: 'Box',
    url: '/dashboard/produtos',
    ordem: 35,
    ativo: true,
    parent_id: null,
    children: []
  },
  {
    id: 'contratos',
    nome: 'Contratos',
    slug: 'contratos',
    icone: 'FileText',
    url: '/dashboard/contratos',
    ordem: 40,
    ativo: true,
    parent_id: null,
    children: []
  },
  {
    id: 'admin',
    nome: 'Administração',
    slug: 'admin',
    icone: 'Shield',
    url: '/dashboard/admin',
    ordem: 90,
    ativo: true,
    parent_id: null,
    children: [
      {
        id: 'admin-usuarios',
        nome: 'Usuários',
        slug: 'admin-usuarios',
        icone: 'UserCog',
        url: '/dashboard/admin/usuarios',
        ordem: 10,
        ativo: true,
        parent_id: 'admin',
        children: []
      },
      {
        id: 'admin-roles',
        nome: 'Roles & Permissões',
        slug: 'admin-roles',
        icone: 'Shield',
        url: '/dashboard/admin/roles',
        ordem: 20,
        ativo: true,
        parent_id: 'admin',
        children: []
      },
      {
        id: 'admin-logs',
        nome: 'Logs do Sistema',
        slug: 'admin-logs',
        icone: 'FileSearch',
        url: '/dashboard/admin/logs',
        ordem: 30,
        ativo: true,
        parent_id: 'admin',
        children: []
      },
      {
        id: 'admin-settings',
        nome: 'Configurações',
        slug: 'admin-settings',
        icone: 'Wrench',
        url: '/dashboard/admin/settings',
        ordem: 40,
        ativo: true,
        parent_id: 'admin',
        children: []
      }
    ]
  }
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('[MENUS API] Erro de autenticação:', authError)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar diretamente se é super admin pelo email do usuário autenticado
    const isSuperAdminDirect = SUPER_ADMINS.includes(user.email || '');

    if (isSuperAdminDirect) {
      
      try {
        // Para super admins, buscar TODOS os menus ativos do banco
        const { data: allMenusFromDB, error: menusError } = await supabase
          .rpc('get_all_menus_hierarchy')

        if (!menusError && allMenusFromDB && allMenusFromDB.length > 0) {
          // Organizar menus em hierarquia
          const organizedMenus = organizeMenusHierarchy(allMenusFromDB)
          
          return NextResponse.json({ 
            success: true,
            data: organizedMenus 
          })
        }
      } catch (error) {
        console.error('[MENUS API] Erro ao buscar menus do banco:', error)
      }
      
      // Fallback: usar lista hardcoded se não conseguir buscar do banco
      
      return NextResponse.json({ 
        success: true,
        data: ALL_MENUS 
      })
    }

    // Buscar perfil do usuário para outras verificações
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('email, role_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[MENUS API] Erro ao buscar perfil:', profileError)
      return NextResponse.json({ 
        success: true,
        data: DEFAULT_MENUS 
      })
    }

    // Verificar se é um super admin específico pelo perfil também
    const isSuperAdmin = SUPER_ADMINS.includes(userProfile.email);

    if (isSuperAdmin) {
      return NextResponse.json({ 
        success: true,
        data: ALL_MENUS 
      })
    }

    // Tentar buscar menus baseados no role se o usuário tiver role_id
    if (userProfile.role_id) {
      try {
        const { data: roleMenus, error: roleMenusError } = await supabase
          .rpc('get_user_menus', { user_id: user.id })

        if (!roleMenusError && roleMenus && roleMenus.length > 0) {
          // Organizar menus em hierarquia
          const organizedMenus = organizeMenusHierarchy(roleMenus)
          return NextResponse.json({ 
            success: true,
            data: organizedMenus 
          })
        }
      } catch (error) {
        console.error('[MENUS API] Erro ao buscar menus do role:', error)
      }
    }

    // Fallback para menus básicos
    return NextResponse.json({ 
      success: true,
      data: DEFAULT_MENUS 
    })

  } catch (error) {
    console.error('[MENUS API] Erro inesperado:', error)
    return NextResponse.json({ 
      success: true,
      data: DEFAULT_MENUS 
    })
  }
}

function organizeMenusHierarchy(menus: any[]): any[] {
  const menusMap = new Map()
  const rootMenus: any[] = []

  // Primeiro, criar mapa de todos os menus
  menus.forEach((menu: any) => {
    menu.children = []
    menusMap.set(menu.id, menu)
  })

  // Depois, organizar a hierarquia
  menus.forEach((menu: any) => {
    if (menu.parent_id) {
      const parent = menusMap.get(menu.parent_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(menu)
      }
    } else {
      rootMenus.push(menu)
    }
  })

  return rootMenus
} 