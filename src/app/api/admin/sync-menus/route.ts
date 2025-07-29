import { NextRequest, NextResponse } from 'next/server'
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

// POST - Sincronizar menus do sistema
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar se é admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o usuário é admin (super admins diretos)
    const { data: userProfile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single()

    const SUPER_ADMINS = ['emersonfilho953@gmail.com', 'gabrielpiffer@gmail.com']
    
    if (!SUPER_ADMINS.includes(userProfile?.email)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const result = await syncSystemMenus(supabase)

    return NextResponse.json({ 
      success: true,
      message: 'Menus do sistema sincronizados com sucesso',
      data: {
        processedMenus: result.size,
        menus: Array.from(result.values()).map(m => ({ id: m.id, nome: m.nome, slug: m.slug }))
      }
    })
  } catch (error) {
    console.error('Erro ao sincronizar menus:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

// GET - Verificar status dos menus
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Contar menus existentes
    const { count: totalMenus } = await supabase
      .from('menus')
      .select('*', { count: 'exact', head: true })

    const { count: systemMenus } = await supabase
      .from('menus')
      .select('*', { count: 'exact', head: true })
      .eq('sistema', true)

    const expectedSystemMenus = SYSTEM_MENUS.length + SYSTEM_MENUS.reduce((acc, menu) => acc + (menu.children?.length || 0), 0)

    return NextResponse.json({
      success: true,
      data: {
        totalMenus: totalMenus || 0,
        systemMenus: systemMenus || 0,
        expectedSystemMenus,
        syncNeeded: (systemMenus || 0) < expectedSystemMenus
      }
    })
  } catch (error) {
    console.error('Erro ao verificar menus:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function syncSystemMenus(supabase: any) {
  const processedMenus = new Map()

  async function processMenu(menu: any, parent_id: string | null = null) {
    try {
      // Verificar se o menu já existe
      const { data: existingMenu, error: fetchError } = await supabase
        .from('menus')
        .select('*')
        .eq('slug', menu.slug)
        .maybeSingle()

      if (fetchError) {
        console.error('Erro ao buscar menu existente:', fetchError)
        throw fetchError
      }

      let menuId = existingMenu?.id

      if (existingMenu) {
        // Atualizar menu existente
        const { data: updatedMenu, error: updateError } = await supabase
          .from('menus')
          .update({
            nome: menu.nome,
            icone: menu.icone,
            url: menu.url,
            parent_id,
            ordem: menu.ordem,
            ativo: true,
            sistema: true
          })
          .eq('id', existingMenu.id)
          .select()
          .single()

        if (updateError) {
          console.error('Erro ao atualizar menu:', updateError)
          throw updateError
        }

        menuId = updatedMenu?.id || existingMenu.id
      } else {
        // Criar novo menu
        const { data: newMenu, error: createError } = await supabase
          .from('menus')
          .insert({
            nome: menu.nome,
            slug: menu.slug,
            icone: menu.icone,
            url: menu.url,
            parent_id,
            ordem: menu.ordem,
            ativo: true,
            sistema: true
          })
          .select()
          .single()

        if (createError) {
          console.error('Erro ao criar menu:', createError)
          throw createError
        }

        menuId = newMenu?.id
      }

      processedMenus.set(menu.slug, { id: menuId, ...menu })

      // Processar submenus
      if (menu.children && menu.children.length > 0) {
        for (const child of menu.children) {
          await processMenu(child, menuId)
        }
      }
    } catch (error) {
      console.error(`Erro ao processar menu ${menu.slug}:`, error)
      throw error
    }
  }

  // Processar todos os menus
  for (const menu of SYSTEM_MENUS) {
    await processMenu(menu)
  }

  return processedMenus
} 