import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { menus } = await request.json()
    
    if (!Array.isArray(menus)) {
      return NextResponse.json({ error: 'Lista de menus inválida' }, { status: 400 })
    }

    // Sincronizar menus com o banco de forma mais robusta
    await syncMenusWithDatabase(supabase, menus)

    return NextResponse.json({ 
      success: true, 
      message: 'Menus sincronizados com sucesso',
      synced: menus.length 
    })
  } catch (error) {
    console.error('Erro ao sincronizar menus:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

async function syncMenusWithDatabase(supabase: any, frontendMenus: any[]) {
  try {
    // Buscar menus existentes do banco usando query direta mais robusta
    const { data: existingMenus, error: fetchError } = await supabase
      .from('menus')
      .select('*')
      .order('ordem', { ascending: true })
    
    if (fetchError) {
      console.error('Erro ao buscar menus existentes:', fetchError)
      // Se a tabela não existe ou há erro, ainda tentamos criar os menus
    }

    const existingMenusMap = new Map()
    
    // Mapear menus existentes se houver
    if (existingMenus) {
      existingMenus.forEach((menu: any) => {
        existingMenusMap.set(menu.slug, menu)
      })
    }

    // Processar menus do frontend
    async function processMenus(menus: any[], parent_id: string | null = null, ordem: number = 10) {
      for (const menu of menus) {
        const existingMenu = existingMenusMap.get(menu.slug)
        
        if (existingMenu) {
          // Verificar se precisa atualizar
          const updates: any = {}
          let needsUpdate = false
          
          if (existingMenu.nome !== menu.title) {
            updates.nome = menu.title
            needsUpdate = true
          }
          if (existingMenu.icone !== menu.icon) {
            updates.icone = menu.icon
            needsUpdate = true
          }
          if (existingMenu.url !== menu.href) {
            updates.url = menu.href
            needsUpdate = true
          }
          if (existingMenu.ordem !== ordem) {
            updates.ordem = ordem
            needsUpdate = true
          }
          if (existingMenu.parent_id !== parent_id) {
            updates.parent_id = parent_id
            needsUpdate = true
          }
          
          if (needsUpdate) {
            const { error: updateError } = await supabase
              .from('menus')
              .update(updates)
              .eq('id', existingMenu.id)
            
            if (updateError) {
              console.error('Erro ao atualizar menu:', updateError)
            }
          }
        } else {
          // Criar novo menu
          const newMenuData = {
            nome: menu.title,
            slug: menu.slug,
            icone: menu.icon,
            url: menu.href,
            parent_id,
            ordem,
            ativo: true,
            sistema: true // Menus vindos do frontend são considerados do sistema
          }
          
          const { data: newMenu, error: createError } = await supabase
            .from('menus')
            .insert(newMenuData)
            .select()
            .single()
          
          if (createError) {
            console.error('Erro ao criar menu:', createError)
          } else if (newMenu) {
            // Adicionar ao mapa para processar submenus
            existingMenusMap.set(menu.slug, newMenu)
          }
        }
        
        // Processar submenus se existirem
        if (menu.children && menu.children.length > 0) {
          const parentMenu = existingMenusMap.get(menu.slug)
          if (parentMenu) {
            await processMenus(menu.children, parentMenu.id, 10)
          }
        }
        
        ordem += 10
      }
    }

    await processMenus(frontendMenus)
  } catch (error) {
    console.error('Erro na sincronização de menus:', error)
    throw error
  }
} 