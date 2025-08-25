'use client';

import { useAuth } from '@/contexts/auth-context';
import { SubprodutosMain } from '@/components/subprodutos/subprodutos-main';

export default function SubprodutosPage() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile) {
    return null; // Redirect handled by DashboardLayout
  }

  return <SubprodutosMain />;
}