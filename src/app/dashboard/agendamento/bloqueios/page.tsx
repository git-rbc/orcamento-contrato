'use client';

import { BloqueiosManager } from '@/components/disponibilidade/bloqueios-manager';
import { usePermissions } from '@/hooks/usePermissions';

export default function BloqueiosPage() {
  const { permissions, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!permissions.canManageBlocks) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para gerenciar bloqueios.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BloqueiosManager
      vendedorId={permissions.vendedorId} // Se for vendedor, mostra apenas seus bloqueios
      canEdit={permissions.canManageBlocks}
    />
  );
}