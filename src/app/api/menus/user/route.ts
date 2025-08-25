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
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar todos os menus ativos do banco de dados
    const { data: menus, error } = await supabase
      .from('menus')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (error) {
      console.error('Erro ao buscar menus:', error);
      return NextResponse.json({ 
        success: true,
        data: [] 
      });
    }

    // Organizar menus em hierarquia
    const menusHierarchy = organizeMenusHierarchy(menus || []);

    return NextResponse.json({
      success: true,
      data: menusHierarchy
    });

  } catch (error) {
    console.error('Erro na API de menus do usuário:', error);
    return NextResponse.json({ 
      success: true,
      data: [] 
    });
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