import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { UserPermissions } from '@/lib/permissions/reunioes-permissions';

interface User {
  id: string;
  email: string;
  role: string;
  nome: string;
}

export function usePermissions() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({
    canViewAllMeetings: false,
    canCreateMeetings: false,
    canEditMeetings: false,
    canDeleteMeetings: false,
    canManageAvailability: false,
    canManageBlocks: false,
    canViewReports: false,
    canManageSettings: false
  });
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Buscar dados completos do usuário
        const { data: userData } = await supabase
          .from('users')
          .select('id, email, role, nome')
          .eq('id', authUser.id)
          .single();

        if (userData) {
          setUser(userData);
          calculatePermissions(userData.role, userData.id);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculatePermissions(role: string, userId: string) {
    switch (role) {
      case 'admin':
        setPermissions({
          canViewAllMeetings: true,
          canCreateMeetings: true,
          canEditMeetings: true,
          canDeleteMeetings: true,
          canManageAvailability: true,
          canManageBlocks: true,
          canViewReports: true,
          canManageSettings: true
        });
        break;

      case 'pre_vendedor':
        setPermissions({
          canViewAllMeetings: false,
          canCreateMeetings: true,
          canEditMeetings: false,
          canDeleteMeetings: false,
          canManageAvailability: false,
          canManageBlocks: false,
          canViewReports: false,
          canManageSettings: false
        });
        break;

      case 'vendedor':
        setPermissions({
          canViewAllMeetings: false,
          canCreateMeetings: true,
          canEditMeetings: true,
          canDeleteMeetings: true,
          canManageAvailability: true,
          canManageBlocks: true,
          canViewReports: false,
          canManageSettings: false,
          vendedorId: userId
        });
        break;

      default:
        setPermissions({
          canViewAllMeetings: false,
          canCreateMeetings: false,
          canEditMeetings: false,
          canDeleteMeetings: false,
          canManageAvailability: false,
          canManageBlocks: false,
          canViewReports: false,
          canManageSettings: false
        });
    }
  }

  // Verificar se pode editar/deletar uma reunião específica
  function canManageMeeting(meeting: { vendedor_id: string; created_by?: string }): boolean {
    if (permissions.canViewAllMeetings) return true;
    
    if (user) {
      return meeting.vendedor_id === user.id || meeting.created_by === user.id;
    }
    
    return false;
  }

  // Verificar se pode gerenciar disponibilidade de um vendedor específico
  function canManageVendedorAvailability(vendedorId: string): boolean {
    if (permissions.canManageAvailability && permissions.canViewAllMeetings) return true;
    
    if (permissions.canManageAvailability && user) {
      return vendedorId === user.id;
    }
    
    return false;
  }

  // Verificar se é admin
  function isAdmin(): boolean {
    return user?.role === 'admin';
  }

  // Verificar se é vendedor
  function isVendedor(): boolean {
    return user?.role === 'vendedor';
  }

  // Verificar se é pré-vendedor
  function isPreVendedor(): boolean {
    return user?.role === 'pre_vendedor';
  }

  // Obter filtros apropriados para o usuário
  function getFiltersForUser() {
    if (permissions.canViewAllMeetings) {
      return {}; // Sem filtros, pode ver tudo
    }
    
    if (user) {
      return { vendedorId: user.id }; // Filtrar apenas suas reuniões
    }
    
    return { vendedorId: 'none' }; // Não pode ver nenhuma reunião
  }

  return {
    user,
    permissions,
    loading,
    
    // Métodos de verificação
    canManageMeeting,
    canManageVendedorAvailability,
    isAdmin,
    isVendedor,
    isPreVendedor,
    getFiltersForUser,
    
    // Refresh
    refreshUser: checkUser
  };
}