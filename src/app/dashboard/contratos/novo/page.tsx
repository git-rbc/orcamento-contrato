'use client';

import { useAuth } from '@/contexts/auth-context';
import { ContractLayout } from '@/components/layout/contract-layout';
import { NovoContrato } from '@/components/contratos/novo-contrato';

export default function NovoContratoPage() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <ContractLayout>
      <NovoContrato />
    </ContractLayout>
  );
}