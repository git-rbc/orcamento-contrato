'use client';

import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from './sidebar';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface ContractLayoutProps {
  children: React.ReactNode;
}

export function ContractLayout({ children }: ContractLayoutProps) {
  const { user, loading, userProfile } = useAuth();
  const router = useRouter();
  const redirectedRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Só redirecionar uma vez, quando não estiver carregando e não houver usuário
    if (!loading && !user && !redirectedRef.current && mountedRef.current) {
      console.log('[ContractLayout] Redirecionando para login - sem usuário autenticado');
      redirectedRef.current = true;
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Resetar flag quando usuário mudar
  useEffect(() => {
    if (user) {
      redirectedRef.current = false;
    }
  }, [user]);

  // Mostrar loading enquanto carrega ou enquanto não tem perfil (mas tem usuário)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não tem usuário e já tentou redirecionar, mostrar mensagem
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // Se tem usuário mas não tem perfil ainda, aguardar
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="h-full p-4">
          {children}
        </div>
      </main>
    </div>
  );
}