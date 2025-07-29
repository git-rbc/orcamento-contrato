import { useState, useCallback } from 'react'

export interface MenuTemplate {
  id: string
  nome: string
  slug: string
  icone: string
  url: string
  visivel: boolean
  is_default: boolean
  children: MenuTemplate[]
}

export interface UseMenuTemplatesReturn {
  templates: MenuTemplate[]
  loading: boolean
  error: string | null
  getTemplateByRole: (roleName: string) => Promise<MenuTemplate[]>
  applyTemplateToRole: (roleId: string, roleName: string) => Promise<boolean>
  getMenuPermissions: (roleId: string) => Promise<MenuTemplate[]>
  updateMenuPermissions: (roleId: string, menus: Array<{menu_id: string, visivel: boolean}>) => Promise<boolean>
}

export function useMenuTemplates(): UseMenuTemplatesReturn {
  const [templates, setTemplates] = useState<MenuTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getTemplateByRole = useCallback(async (roleName: string): Promise<MenuTemplate[]> => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('[useMenuTemplates] Buscando template para role:', roleName)
      
      const response = await fetch(`/api/admin/menus/permissions?template=true&roleName=${encodeURIComponent(roleName)}`)
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar template: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar template')
      }
      
      console.log('[useMenuTemplates] Template encontrado:', data.data?.length, 'menus')
      setTemplates(data.data || [])
      return data.data || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useMenuTemplates] Erro:', errorMessage)
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const applyTemplateToRole = useCallback(async (roleId: string, roleName: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('[useMenuTemplates] Aplicando template:', { roleId, roleName })
      
      const response = await fetch('/api/admin/menus/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleId,
          roleName,
          applyTemplate: true
        })
      })
      
      if (!response.ok) {
        throw new Error(`Erro ao aplicar template: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao aplicar template')
      }
      
      console.log('[useMenuTemplates] Template aplicado com sucesso:', data.message)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useMenuTemplates] Erro ao aplicar template:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const getMenuPermissions = useCallback(async (roleId: string): Promise<MenuTemplate[]> => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('[useMenuTemplates] Buscando permissões para role:', roleId)
      
      const response = await fetch(`/api/admin/menus/permissions?roleId=${roleId}`)
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar permissões: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar permissões')
      }
      
      console.log('[useMenuTemplates] Permissões encontradas:', data.data?.length, 'menus')
      return data.data || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useMenuTemplates] Erro:', errorMessage)
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const updateMenuPermissions = useCallback(async (
    roleId: string, 
    menus: Array<{menu_id: string, visivel: boolean}>
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('[useMenuTemplates] Atualizando permissões:', { roleId, menusCount: menus.length })
      
      const response = await fetch('/api/admin/menus/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleId,
          menus
        })
      })
      
      if (!response.ok) {
        throw new Error(`Erro ao atualizar permissões: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao atualizar permissões')
      }
      
      console.log('[useMenuTemplates] Permissões atualizadas com sucesso')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[useMenuTemplates] Erro ao atualizar permissões:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    templates,
    loading,
    error,
    getTemplateByRole,
    applyTemplateToRole,
    getMenuPermissions,
    updateMenuPermissions
  }
} 