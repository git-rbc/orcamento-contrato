import { NextRequest, NextResponse } from 'next/server'
import { MenuService } from '@/services/menus'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Menus do sistema que devem existir
const SYSTEM_MENUS = [
  {
    nome: 'Dashboard',
    slug: 'dashboard',
    icone: 'Home',
    url: '/dashboard',
    ordem: 10,
    parent_id: null,
    children: []
  },
  {
    nome: 'Clientes',
    slug: 'clientes',
    icone: 'Users',
    url: '/dashboard/clientes',
    ordem: 20,
    parent_id: null,
    children: []
  },
  {
    nome: 'Serviços',
    slug: 'servicos',
    icone: 'Package',
    url: '/dashboard/servicos',
    ordem: 30,
    parent_id: null,
    children: []
  },
  {
    nome: 'Produtos',
    slug: 'produtos',
    icone: 'Box',
    url: '/dashboard/produtos',
    ordem: 35,
    parent_id: null,
    children: []
  },
  {
    nome: 'Contratos',
    slug: 'contratos',
    icone: 'FileText',
    url: '/dashboard/contratos',
    ordem: 40,
    parent_id: null,
    children: []
  },
  {
    nome: 'Administração',
    slug: 'admin',
    icone: 'Shield',
    url: null,
    ordem: 90,
    parent_id: null,
    children: [
      {
        nome: 'Usuários',
        slug: 'admin-usuarios',
        icone: 'UserCog',
        url: '/dashboard/admin/usuarios',
        ordem: 10
      },
      {
        nome: 'Roles & Permissões',
        slug: 'admin-roles',
        icone: 'Shield',
        url: '/dashboard/admin/roles',
        ordem: 20
      },
      {
        nome: 'Logs do Sistema',
        slug: 'admin-logs',
        icone: 'FileSearch',
        url: '/dashboard/admin/logs',
        ordem: 30
      },
      {
        nome: 'Configurações',
        slug: 'admin-settings',
        icone: 'Wrench',
        url: '/dashboard/admin/settings',
        ordem: 40
      }
    ]
  }
];

// GET - Buscar configuração de menus para um role OU obter template
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar autenticação e se é admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role_id, roles(nivel_hierarquia)')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.roles || (userProfile.roles as any).nivel_hierarquia < 80) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const url = new URL(request.url)
    const roleId = url.searchParams.get('roleId')
    const getTemplate = url.searchParams.get('template') // ?template=true
    const roleName = url.searchParams.get('roleName') // ?roleName=Admin

    // Se solicitou template, retornar template baseado no nome do role
    if (getTemplate === 'true' && roleName) {
      console.log('[MENU PERMISSIONS] Buscando template para role:', roleName)
      
      try {
        const { data: templateMenus, error: templateError } = await supabase
          .rpc('get_menu_template_by_role_type', { role_name: roleName })

        if (templateError) {
          console.error('[MENU PERMISSIONS] Erro ao buscar template:', templateError)
          return NextResponse.json({ error: 'Erro ao buscar template' }, { status: 500 })
        }

        console.log('[MENU PERMISSIONS] Template encontrado:', templateMenus?.length, 'menus')

        // Organizar template em hierarquia
        const organizedTemplate = templateMenus?.map((menu: any) => ({
          id: menu.menu_id,
          nome: menu.menu_nome,
          slug: menu.menu_slug,
          icone: menu.menu_icone,
          url: menu.menu_url,
          ordem: 0, // Será definida pela ordem do banco
          visivel: menu.visivel,
          is_default: menu.is_default,
          children: []
        })) || []

        return NextResponse.json({ 
          success: true,
          data: organizedTemplate,
          isTemplate: true
        })
      } catch (error) {
        console.error('[MENU PERMISSIONS] Erro inesperado ao buscar template:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
      }
    }

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID é obrigatório' }, { status: 400 })
    }

    console.log('[MENU PERMISSIONS] Buscando configuração existente para role:', roleId)

    // Buscar todos os menus
    const allMenus = await MenuService.listarHierarquia()
    
    // Buscar configuração atual do role
    const roleConfig = await MenuService.obterConfiguracaoRole(roleId)
    const roleConfigMap = new Map(roleConfig.map(c => [c.menu_id, c.visivel]))

    // Combinar informações
    function processMenus(menus: any[]): any[] {
      return menus.map(menu => ({
        id: menu.id,
        nome: menu.nome,
        slug: menu.slug,
        icone: menu.icone,
        url: menu.url,
        ordem: menu.ordem,
        visivel: roleConfigMap.get(menu.id) ?? false,
        children: menu.children ? processMenus(menu.children) : []
      }))
    }

    return NextResponse.json({ 
      success: true,
      data: processMenus(allMenus),
      isTemplate: false
    })
  } catch (error) {
    console.error('Erro ao buscar configuração de menus:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Atualizar configuração de menus para um role
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar autenticação e se é admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role_id, roles(nivel_hierarquia)')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.roles || (userProfile.roles as any).nivel_hierarquia < 80) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { roleId, menus } = await request.json()

    if (!roleId || !Array.isArray(menus)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Configurar menus para o role
    await MenuService.configurarMenusRole({
      role_id: roleId,
      menus: menus.map(m => ({
        menu_id: m.menu_id,
        visivel: m.visivel
      }))
    })

    return NextResponse.json({ 
      success: true,
      message: 'Permissões de menus atualizadas com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar permissões de menus:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}




// PUT - Aplicar template de menus para um role
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar autenticação e se é admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role_id, roles(nivel_hierarquia)')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.roles || (userProfile.roles as any).nivel_hierarquia < 80) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { roleId, roleName, applyTemplate } = await request.json()

    if (!roleId || !roleName) {
      return NextResponse.json({ error: 'Role ID e nome são obrigatórios' }, { status: 400 })
    }

    console.log('[MENU PERMISSIONS] Aplicando template para role:', { roleId, roleName, applyTemplate })

    if (applyTemplate) {
      try {
        // Buscar template baseado no nome do role
        const { data: templateMenus, error: templateError } = await supabase
          .rpc('get_menu_template_by_role_type', { role_name: roleName })

        if (templateError) {
          console.error('[MENU PERMISSIONS] Erro ao buscar template:', templateError)
          return NextResponse.json({ error: 'Erro ao buscar template' }, { status: 500 })
        }

        if (!templateMenus || templateMenus.length === 0) {
          return NextResponse.json({ error: 'Nenhum template encontrado' }, { status: 404 })
        }

        // Preparar dados para aplicar
        const menusToApply = templateMenus.map((menu: any) => ({
          menu_id: menu.menu_id,
          visivel: menu.visivel
        }))

        // Aplicar template usando o serviço existente
        await MenuService.configurarMenusRole({
          role_id: roleId,
          menus: menusToApply
        })

        console.log('[MENU PERMISSIONS] Template aplicado com sucesso:', menusToApply.length, 'menus')

        return NextResponse.json({ 
          success: true,
          message: `Template aplicado com sucesso para ${roleName}`,
          appliedMenus: menusToApply.length
        })
      } catch (error) {
        console.error('[MENU PERMISSIONS] Erro ao aplicar template:', error)
        return NextResponse.json({ error: 'Erro ao aplicar template' }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'Parâmetro applyTemplate deve ser true' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erro ao aplicar template de menus:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 