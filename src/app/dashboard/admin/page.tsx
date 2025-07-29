'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Shield, 
  FileSearch, 
  Settings, 
  UserCog, 
  Database,
  Activity,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const { userProfile, isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>Acesso Negado</CardTitle>
              <CardDescription>
                Você não tem permissão para acessar esta área.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const adminCards = [
    {
      title: 'Usuários',
      description: 'Gerenciar usuários do sistema',
      icon: Users,
      href: '/dashboard/admin/usuarios',
      count: 'Gerir contas'
    },
    {
      title: 'Roles & Permissões',
      description: 'Controlar acesso e permissões',
      icon: Shield,
      href: '/dashboard/admin/roles',
      count: 'Configurar acesso'
    },
    {
      title: 'Logs do Sistema',
      description: 'Auditoria e monitoramento',
      icon: FileSearch,
      href: '/dashboard/admin/logs',
      count: 'Ver atividades'
    },
    {
      title: 'Configurações',
      description: 'Configurações gerais do sistema',
      icon: Settings,
      href: '/dashboard/admin/settings',
      count: 'Configurar sistema'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administração</h1>
          <p className="text-muted-foreground">
            Painel de controle e gerenciamento do sistema
          </p>
        </div>
        <Badge variant="default" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {userProfile?.role_nome || 'Admin'}
        </Badge>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistema</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">
              Funcionando normalmente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base de Dados</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Conectada</div>
            <p className="text-xs text-muted-foreground">
              Todas as tabelas disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">
              Sessões ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seu Nível</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProfile?.nivel_hierarquia || 100}</div>
            <p className="text-xs text-muted-foreground">
              Acesso total ao sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tools */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Ferramentas de Administração</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {adminCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.href} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Icon className="h-8 w-8 text-primary" />
                    <Badge variant="outline">{card.count}</Badge>
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={card.href}>
                    <Button className="w-full">
                      Acessar
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Ações Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Criar Usuário
              </CardTitle>
              <CardDescription>
                Adicionar novo usuário ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/admin/usuarios">
                <Button variant="outline" className="w-full">
                  Criar Usuário
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurar Permissões
              </CardTitle>
              <CardDescription>
                Gerenciar roles e permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/admin/roles">
                <Button variant="outline" className="w-full">
                  Configurar
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                Ver Logs
              </CardTitle>
              <CardDescription>
                Verificar atividades recentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/admin/logs">
                <Button variant="outline" className="w-full">
                  Ver Logs
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 