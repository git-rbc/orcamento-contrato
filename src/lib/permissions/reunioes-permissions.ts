import { createServerSupabaseClient } from '@/lib/supabase-server';

export interface UserPermissions {
  canViewAllMeetings: boolean;
  canCreateMeetings: boolean;
  canEditMeetings: boolean;
  canDeleteMeetings: boolean;
  canManageAvailability: boolean;
  canManageBlocks: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  vendedorId?: string; // Se for vendedor, armazenar ID para filtrar dados
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Buscar informações do usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      // Usuário não encontrado, retornar permissões mínimas
      return {
        canViewAllMeetings: false,
        canCreateMeetings: false,
        canEditMeetings: false,
        canDeleteMeetings: false,
        canManageAvailability: false,
        canManageBlocks: false,
        canViewReports: false,
        canManageSettings: false
      };
    }

    const role = user.role;

    switch (role) {
      case 'admin':
        return {
          canViewAllMeetings: true,
          canCreateMeetings: true,
          canEditMeetings: true,
          canDeleteMeetings: true,
          canManageAvailability: true,
          canManageBlocks: true,
          canViewReports: true,
          canManageSettings: true
        };

      case 'pre_vendedor':
        return {
          canViewAllMeetings: false,
          canCreateMeetings: true,
          canEditMeetings: false, // Apenas suas próprias reuniões
          canDeleteMeetings: false,
          canManageAvailability: false,
          canManageBlocks: false,
          canViewReports: false,
          canManageSettings: false
        };

      case 'vendedor':
        return {
          canViewAllMeetings: false, // Apenas suas próprias reuniões
          canCreateMeetings: true,
          canEditMeetings: true, // Apenas suas próprias reuniões
          canDeleteMeetings: true, // Apenas suas próprias reuniões
          canManageAvailability: true, // Apenas sua própria disponibilidade
          canManageBlocks: true, // Apenas seus próprios bloqueios
          canViewReports: false, // Apenas suas próprias métricas
          canManageSettings: false,
          vendedorId: user.id
        };

      default:
        return {
          canViewAllMeetings: false,
          canCreateMeetings: false,
          canEditMeetings: false,
          canDeleteMeetings: false,
          canManageAvailability: false,
          canManageBlocks: false,
          canViewReports: false,
          canManageSettings: false
        };
    }
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    return {
      canViewAllMeetings: false,
      canCreateMeetings: false,
      canEditMeetings: false,
      canDeleteMeetings: false,
      canManageAvailability: false,
      canManageBlocks: false,
      canViewReports: false,
      canManageSettings: false
    };
  }
}

export async function checkMeetingPermission(
  userId: string, 
  action: 'view' | 'edit' | 'delete',
  meetingData?: { vendedor_id: string; created_by?: string }
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);

  switch (action) {
    case 'view':
      if (permissions.canViewAllMeetings) return true;
      if (meetingData) {
        return meetingData.vendedor_id === userId || meetingData.created_by === userId;
      }
      return false;

    case 'edit':
      if (permissions.canEditMeetings && permissions.canViewAllMeetings) return true;
      if (meetingData && permissions.canEditMeetings) {
        return meetingData.vendedor_id === userId || meetingData.created_by === userId;
      }
      return false;

    case 'delete':
      if (permissions.canDeleteMeetings && permissions.canViewAllMeetings) return true;
      if (meetingData && permissions.canDeleteMeetings) {
        return meetingData.vendedor_id === userId || meetingData.created_by === userId;
      }
      return false;

    default:
      return false;
  }
}

export async function checkAvailabilityPermission(
  userId: string,
  targetVendedorId: string,
  action: 'view' | 'edit' | 'delete'
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);

  // Admin pode gerenciar disponibilidade de qualquer vendedor
  if (permissions.canManageAvailability && permissions.canViewAllMeetings) {
    return true;
  }

  // Vendedor pode gerenciar apenas sua própria disponibilidade
  if (permissions.canManageAvailability && userId === targetVendedorId) {
    return true;
  }

  return false;
}

export async function validateRoleAccess(
  requiredRoles: string[],
  userRole: string
): Promise<boolean> {
  return requiredRoles.includes(userRole);
}

// Middleware helper para verificar permissões em rotas API
export async function withPermissionCheck(
  request: Request,
  requiredPermission: keyof UserPermissions,
  handler: (permissions: UserPermissions) => Promise<Response>
): Promise<Response> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const permissions = await getUserPermissions(user.id);

    if (!permissions[requiredPermission]) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return await handler(permissions);
  } catch (error) {
    console.error('Erro na verificação de permissão:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}