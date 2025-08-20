'use client';

import { DashboardAdministrativo } from '@/components/reunioes/dashboard-administrativo';
import { usePermissions } from '@/hooks/usePermissions';

export default function DashboardReuniaoesPage() {
  const { permissions, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Todos os perfis podem ver o dashboard, mas com dados filtrados conforme suas permissões
  return <DashboardAdministrativo />;
}