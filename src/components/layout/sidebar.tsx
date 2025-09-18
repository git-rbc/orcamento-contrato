'use client';

import { useState, memo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Home, 
  Users, 
  Package, 
  FileText, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Shield,
  UserCog,
  FileSearch,
  Wrench,
  Box,
  PenSquare,
  Building2,
  Tag,
  Calendar,
  Clock,
  Ban,
  BarChart3,
  Timer,
  TrendingUp,
  MessageSquare,
  List,
  CalendarDays
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface SidebarProps {
  className?: string;
}

interface MenuItem {
  id?: string;
  title: string;
  slug: string;
  href: string;
  icon: any;
  description: string;
  disabled?: boolean;
  children?: MenuItem[];
}

// Definição dos menus disponíveis no sistema (fonte da verdade)
const AVAILABLE_MENUS: MenuItem[] = [
  {
    title: 'Dashboard',
    slug: 'dashboard',
    href: '/dashboard',
    icon: 'Home',
    description: 'Visão geral'
  },
  {
    title: 'Agendamento',
    slug: 'agendamento',
    href: '/dashboard/agendamento',
    icon: 'Calendar',
    description: 'Sistema de agendamento de reuniões',
    children: [
      {
        title: 'Reuniões',
        slug: 'agendamento-reunioes',
        href: '/dashboard/agendamento/reunioes',
        icon: 'Users',
        description: 'Gestão de reuniões'
      },
      {
        title: 'Agenda Integrada',
        slug: 'agendamento-agenda-integrada',
        href: '/dashboard/agendamento/agenda-integrada',
        icon: 'CalendarDays',
        description: 'Visualização unificada com reuniões, reservas e fila de espera'
      },
      {
        title: 'Disponibilidade',
        slug: 'agendamento-disponibilidade',
        href: '/dashboard/agendamento/disponibilidade',
        icon: 'Clock',
        description: 'Configurar horários disponíveis'
      },
      {
        title: 'Bloqueios',
        slug: 'agendamento-bloqueios',
        href: '/dashboard/agendamento/bloqueios',
        icon: 'Ban',
        description: 'Gerenciar bloqueios de horários'
      },
      {
        title: 'Dashboard',
        slug: 'agendamento-dashboard',
        href: '/dashboard/agendamento/dashboard',
        icon: 'BarChart3',
        description: 'Métricas de agendamento'
      },
      {
        title: 'Performance Vendedores',
        slug: 'agendamento-performance',
        href: '/dashboard/agendamento/performance',
        icon: 'TrendingUp',
        description: 'Rankings (Geral, Online, Presencial, 10 dias)'
      }
    ]
  },
  {
    title: 'Calendário',
    slug: 'calendario-menu',
    href: '/dashboard/calendario',
    icon: 'Calendar',
    description: 'Gestão de reservas e disponibilidade',
    children: [
      {
        title: 'Calendário',
        slug: 'calendario-principal',
        href: '/dashboard/calendario',
        icon: 'Calendar',
        description: 'Calendário principal'
      },
      {
        title: 'Reservas Temporárias',
        slug: 'calendario-reservas-temporarias',
        href: '/dashboard/calendario/reservas-temporarias',
        icon: 'Timer',
        description: 'Reservas temporárias'
      },
      {
        title: 'Fila de Espera',
        slug: 'calendario-fila-espera',
        href: '/dashboard/calendario/fila-espera',
        icon: 'Users',
        description: 'Gerenciar fila de espera'
      },
      {
        title: 'Dashboard Vendedor',
        slug: 'calendario-dashboard-vendedor',
        href: '/dashboard/calendario/dashboard-vendedor',
        icon: 'BarChart3',
        description: 'Dashboard para vendedores'
      },
      {
        title: 'Métricas',
        slug: 'calendario-metricas',
        href: '/dashboard/calendario/metricas',
        icon: 'TrendingUp',
        description: 'Métricas e relatórios'
      }
    ]
  },
  {
    title: 'Contrato',
    slug: 'contrato-menu',
    href: '/dashboard/contratos',
    icon: 'FileText',
    description: 'Gestão de contratos e produtos',
    children: [
      {
        title: 'Produtos',
        slug: 'produtos',
        href: '/dashboard/produtos',
        icon: 'Box',
        description: 'Gestão de produtos'
      },
      {
        title: 'Serviços',
        slug: 'servicos',
        href: '/dashboard/servicos',
        icon: 'Package',
        description: 'Gestão de serviços'
      },
      {
        title: 'Propostas',
        slug: 'propostas',
        href: '/dashboard/propostas',
        icon: 'FileText',
        description: 'Gestão de propostas'
      },
      {
        title: 'Contratos',
        slug: 'contratos',
        href: '/dashboard/contratos',
        icon: 'PenSquare',
        description: 'Orçamentos e contratos'
      }
    ]
  },
  {
    title: 'Administração',
    slug: 'admin',
    href: '/dashboard/admin',
    icon: 'Shield',
    description: 'Gestão de usuários e sistema',
    children: [
      {
        title: 'Administração',
        slug: 'admin-principal',
        href: '/dashboard/admin',
        icon: 'Shield',
        description: 'Página principal de administração'
      },
      {
        title: 'Clientes',
        slug: 'clientes',
        href: '/dashboard/clientes',
        icon: 'Users',
        description: 'Gestão de clientes'
      },
      {
        title: 'Usuários',
        slug: 'admin-usuarios',
        href: '/dashboard/admin/usuarios',
        icon: 'UserCog',
        description: 'Gestão de usuários'
      },
      {
        title: 'Espaços de Eventos',
        slug: 'espacos-eventos',
        href: '/dashboard/espacos-eventos',
        icon: 'Building2',
        description: 'Espaços e ambientes para eventos'
      },
      {
        title: 'Roles & Permissões',
        slug: 'admin-roles',
        href: '/dashboard/admin/roles',
        icon: 'Shield',
        description: 'Controle de acesso'
      },
      {
        title: 'Cupom de Desconto',
        slug: 'admin-cupons',
        href: '/dashboard/admin/cupons',
        icon: 'Tag',
        description: 'Gestão de cupons de desconto'
      }
    ]
  },
  {
    title: 'Relatórios',
    slug: 'relatorios',
    href: '/dashboard/relatorios',
    icon: 'BarChart3',
    description: 'Análises e estatísticas',
    disabled: true
  }
];

// Mapeamento de ícones
const iconMap: Record<string, any> = {
  Home,
  Users,
  Package,
  FileText,
  Settings,
  Shield,
  UserCog,
  FileSearch,
  Wrench,
  Box,
  PenSquare,
  Building2,
  Tag,
  Calendar,
  Clock,
  Ban,
  BarChart3,
  Timer,
  TrendingUp,
  MessageSquare,
  List,
  CalendarDays
};

// Componente para renderizar itens de menu (incluindo submenus)
function MenuItemComponent({ 
  item, 
  pathname, 
  collapsed 
}: { 
  item: MenuItem; 
  pathname: string; 
  collapsed: boolean; 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const isActive = pathname === item.href;
  const hasChildren = item.children && item.children.length > 0;
  const Icon = iconMap[item.icon] || Settings;

  // Verificar se algum submenu está ativo
  const hasActiveChild = hasChildren && item.children!.some(child => 
    pathname === child.href || pathname.startsWith(child.href + '/')
  );

  // Auto-expandir se tem filho ativo
  useEffect(() => {
    if (hasActiveChild && !collapsed) {
      setIsExpanded(true);
    }
  }, [hasActiveChild, collapsed]);

  const handleClick = () => {
    if (hasChildren && !collapsed) {
      // Sempre alternar entre expandido/recolhido
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div>
      {item.disabled ? (
        <div
          className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-muted-foreground cursor-not-allowed opacity-50 ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? item.title : item.description}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{item.title}</span>
              <p className="text-xs text-muted-foreground truncate">
                {item.description}
              </p>
            </div>
          )}
        </div>
      ) : hasChildren ? (
        <div>
          <div
            onClick={handleClick}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer ${
              hasActiveChild ? 'bg-accent/50 text-accent-foreground' : ''
            } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? item.title : item.description}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{item.title}</span>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
                <ChevronDown 
                  className={`h-4 w-4 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`} 
                />
              </>
            )}
          </div>
          
          {/* Submenus */}
          {!collapsed && isExpanded && hasChildren && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map(child => (
                <Link key={child.slug} href={child.href}>
                  <div
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground ${
                      pathname === child.href ? 'bg-accent text-accent-foreground' : ''
                    }`}
                    title={child.description}
                  >
                                         {(() => {
                       const ChildIcon = iconMap[child.icon] || Settings;
                       return <ChildIcon className="h-4 w-4 flex-shrink-0" />;
                     })()}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{child.title}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Link href={item.href}>
          <div
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground ${
              isActive ? 'bg-accent text-accent-foreground' : ''
            } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? item.title : item.description}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{item.title}</span>
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
              </div>
            )}
          </div>
        </Link>
      )}
    </div>
  );
}

function SidebarComponent({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenus, setUserMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const { userProfile, isAdmin, signOut } = useAuth();
  const router = useRouter();

  // Auto-recolher sidebar quando estiver na rota de novo contrato
  useEffect(() => {
    if (pathname === '/dashboard/contratos/novo') {
      setCollapsed(true);
    }
  }, [pathname]);

  // Buscar menus do usuário
  useEffect(() => {
    const initializeMenus = async () => {
      try {
        // Apenas buscar menus permitidos para o usuário
        await fetchUserMenus();
      } catch (error) {
        console.error('Erro ao inicializar menus:', error);
        // Fallback para menus básicos em caso de erro
        setUserMenus([AVAILABLE_MENUS[0], AVAILABLE_MENUS[1]]); // Dashboard e Clientes
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) {
      initializeMenus();
    }
  }, [userProfile]);

  const fetchUserMenus = async () => {
    try {
      const response = await fetch('/api/menus/user');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar menus do usuário');
      }
      
      const responseData = await response.json();
      
      if (!responseData.success || !responseData.data) {
        throw new Error('Dados de menus inválidos')
      }
      
      const { data } = responseData;
      
      // Converter menus do banco para formato do frontend
      const convertedMenus = convertDatabaseMenusToFrontend(data);
      setUserMenus(convertedMenus);
      
    } catch (error) {
      console.error('Erro ao buscar menus:', error);
      // Fallback para menus básicos em caso de erro
      setUserMenus([AVAILABLE_MENUS[0], AVAILABLE_MENUS[1]]); // Dashboard e Clientes
    }
  };

  const convertDatabaseMenusToFrontend = (dbMenus: any[]): MenuItem[] => {
    return dbMenus.map(menu => ({
      id: menu.id,
      title: menu.nome,
      slug: menu.slug,
      href: menu.url || '#',
      icon: menu.icone, // Manter como string para usar no mapeamento
      description: menu.nome,
      disabled: !menu.url,
      children: menu.children ? convertDatabaseMenusToFrontend(menu.children) : undefined
    }));
  };

  const handleSignOut = async () => {
    // O signOut agora faz reload automático da página
    await signOut();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className={`bg-card border-r border-border transition-all duration-300 w-64 ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border-r border-border transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    } ${className}`}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">GC</span>
                </div>
                <span className="font-bold text-lg">Gestão Contratos</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* User Profile */}
        {userProfile && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(userProfile.nome)}
                </AvatarFallback>
              </Avatar>
              
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{userProfile.nome}</p>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={isAdmin ? "default" : "secondary"} 
                      className="text-xs"
                      style={{ 
                        backgroundColor: userProfile.role_cor || undefined,
                        color: isAdmin ? 'white' : undefined
                      }}
                    >
                      {isAdmin ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          {userProfile.role_nome || 'Admin'}
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          {userProfile.role_nome || 'Vendedor'}
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              )}
              
              {/* Notification Bell */}
              <NotificationBell />
            </div>
            
            {!collapsed && (
              <div className="mt-3 text-xs text-muted-foreground truncate">
                {userProfile.email}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto 
                        [&::-webkit-scrollbar]:w-1.5
                        [&::-webkit-scrollbar-track]:bg-transparent
                        [&::-webkit-scrollbar-thumb]:bg-gray-100
                        [&::-webkit-scrollbar-thumb]:rounded-full
                        [&::-webkit-scrollbar-thumb:hover]:bg-gray-200
                        dark:[&::-webkit-scrollbar-thumb]:bg-gray-800
                        dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-700">
          {AVAILABLE_MENUS.filter(item => !item.disabled).map((item) => {
            // Verificar se existe submenu "Sub-produtos" no banco para adicionar ao menu Contrato
            if (item.slug === 'contrato-menu' && userMenus.length > 0) {
              // Buscar menu Contratos no banco
              const contratoMenuDB = userMenus.find(dbMenu => dbMenu.slug === 'contratos');
              if (contratoMenuDB && contratoMenuDB.children && contratoMenuDB.children.length > 0) {
                // Adicionar sub-produtos aos children se não existir
                const hasSubprodutos = item.children?.some(child => child.slug === 'subprodutos');
                if (!hasSubprodutos) {
                  const subprodutosSubmenu = contratoMenuDB.children.find((child: any) => child.slug === 'subprodutos');
                  if (subprodutosSubmenu) {
                    item.children = item.children || [];
                    const produtosIndex = item.children.findIndex(child => child.slug === 'produtos');
                    const insertIndex = produtosIndex >= 0 ? produtosIndex + 1 : item.children.length;
                    item.children.splice(insertIndex, 0, {
                      title: 'Sub-produtos',
                      slug: 'subprodutos',
                      href: '/dashboard/contratos/subprodutos',
                      icon: 'Package',
                      description: 'Gestão de sub-produtos'
                    });
                  }
                }
              }
            }
            
            return (
              <MenuItemComponent 
                key={item.slug} 
                item={item} 
                pathname={pathname} 
                collapsed={collapsed} 
              />
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          {collapsed ? (
            <div className="flex flex-col space-y-2 items-center">
              <ThemeToggle />
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="px-2"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <ThemeToggle />
              </div>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2">Sair</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const Sidebar = memo(SidebarComponent); 
