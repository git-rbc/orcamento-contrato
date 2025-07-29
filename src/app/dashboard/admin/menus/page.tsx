'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { 
  Settings, 
  Search, 
  Save,
  RefreshCw,
  Menu,
  Shield,
  Users,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle
} from 'lucide-react';

import { useMenuTemplates, MenuTemplate } from '@/hooks/useMenuTemplates';
import { Role } from '@/types/database';

interface RoleMenuStats {
  role: Role;
  totalMenus: number;
  activeMenus: number;
  percentage: number;
}

export default function AdminMenusPage() {
  const { userProfile, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleMenus, setRoleMenus] = useState<MenuTemplate[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [roleStats, setRoleStats] = useState<RoleMenuStats[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const menuTemplates = useMenuTemplates();

  useEffect(() => {
    if (isAdmin && userProfile?.nivel_hierarquia && userProfile.nivel_hierarquia >= 90) {
      fetchRoles();
    }
  }, [isAdmin, userProfile]);

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await fetch('/api/admin/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.data || []);
        calculateRoleStats(data.data || []);
      } else {
        toast.error('Erro ao carregar roles');
      }
    } catch (error) {
      console.error('Erro ao buscar roles:', error);
      toast.error('Erro ao carregar roles');
    } finally {
      setLoadingRoles(false);
    }
  };

  const calculateRoleStats = async (rolesList: Role[]) => {
    const stats: RoleMenuStats[] = [];
    
    for (const role of rolesList) {
      try {
        const menus = await menuTemplates.getMenuPermissions(role.id);
        const totalMenus = menus.length;
        const activeMenus = menus.filter(m => m.visivel).length;
        const percentage = totalMenus > 0 ? (activeMenus / totalMenus) * 100 : 0;
        
        stats.push({
          role,
          totalMenus,
          activeMenus,
          percentage
        });
      } catch (error) {
        console.error(`Erro ao calcular stats para role ${role.nome}:`, error);
        stats.push({
          role,
          totalMenus: 0,
          activeMenus: 0,
          percentage: 0
        });
      }
    }
    
    setRoleStats(stats);
  };

  const loadRoleMenus = async (role: Role) => {
    try {
      setLoadingMenus(true);
      setSelectedRole(role);
      
      console.log('[ADMIN MENUS] Carregando menus para role:', role.nome);
      
      const menus = await menuTemplates.getMenuPermissions(role.id);
      setRoleMenus(menus);
      setActiveTab('permissions');
    } catch (error) {
      console.error('[ADMIN MENUS] Erro ao carregar menus:', error);
      toast.error('Erro ao carregar menus da role');
    } finally {
      setLoadingMenus(false);
    }
  };

  const applyTemplate = async (role: Role) => {
    try {
      console.log('[ADMIN MENUS] Aplicando template para role:', role.nome);
      
      const success = await menuTemplates.applyTemplateToRole(role.id, role.nome);
      
      if (success) {
        toast.success(`Template aplicado com sucesso para ${role.nome}!`);
        
        // Recarregar dados
        if (selectedRole?.id === role.id) {
          await loadRoleMenus(role);
        }
        await calculateRoleStats(roles);
      } else {
        toast.error('Erro ao aplicar template');
      }
    } catch (error) {
      console.error('[ADMIN MENUS] Erro ao aplicar template:', error);
      toast.error('Erro inesperado ao aplicar template');
    }
  };

  const handleMenuToggle = (menuId: string, checked: boolean) => {
    setRoleMenus(prev => prev.map(menu => 
      menu.id === menuId ? { ...menu, visivel: checked } : menu
    ));
  };

  const savePermissions = async () => {
    if (!selectedRole) return;

    try {
      setSavingPermissions(true);
      
      const permissions = roleMenus.map(menu => ({
        menu_id: menu.id,
        visivel: menu.visivel
      }));

      console.log('[ADMIN MENUS] Salvando permissões:', { 
        roleId: selectedRole.id, 
        permissionsCount: permissions.length 
      });

      const success = await menuTemplates.updateMenuPermissions(selectedRole.id, permissions);

      if (success) {
        toast.success('Permissões salvas com sucesso!');
        await calculateRoleStats(roles);
      } else {
        toast.error('Erro ao salvar permissões');
      }
    } catch (error) {
      console.error('[ADMIN MENUS] Erro ao salvar permissões:', error);
      toast.error('Erro inesperado ao salvar permissões');
    } finally {
      setSavingPermissions(false);
    }
  };

  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles;
    
    return roles.filter(role =>
      role.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roles, searchTerm]);

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile?.nivel_hierarquia || userProfile.nivel_hierarquia < 90) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
            <h2 className="text-2xl font-bold">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Apenas super administradores podem acessar o gerenciamento de menus.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Administração de Menus</h1>
            <p className="text-muted-foreground">
              Gerencie permissões de menus para cada cargo
            </p>
          </div>
          
          <Button onClick={fetchRoles} disabled={loadingRoles}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingRoles ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="permissions" disabled={!selectedRole}>
              Permissões {selectedRole && `(${selectedRole.nome})`}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* Filtros */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Cargos
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{roles.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Cargos com Permissões
                  </CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {roleStats.filter(s => s.activeMenus > 0).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Maior Cobertura
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.max(...roleStats.map(s => s.percentage), 0).toFixed(0)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Sem Permissões
                  </CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {roleStats.filter(s => s.activeMenus === 0).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Roles */}
            <Card>
              <CardHeader>
                <CardTitle>Cargos e Permissões</CardTitle>
                <CardDescription>
                  Clique em um cargo para gerenciar suas permissões de menu
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRoles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Nível</TableHead>
                        <TableHead>Menus Ativos</TableHead>
                        <TableHead>Cobertura</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoles.map((role) => {
                        const stats = roleStats.find(s => s.role.id === role.id);
                        return (
                          <TableRow key={role.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: role.cor }} 
                                />
                                <div>
                                  <div className="font-medium">{role.nome}</div>
                                  {role.descricao && (
                                    <div className="text-sm text-muted-foreground">
                                      {role.descricao}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={role.nivel_hierarquia >= 80 ? 'default' : 'secondary'}>
                                {role.nivel_hierarquia}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {stats ? `${stats.activeMenus}/${stats.totalMenus}` : 'Carregando...'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-secondary rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${stats?.percentage || 0}%` }}
                                  />
                                </div>
                                <span className="text-sm min-w-[3rem]">
                                  {stats?.percentage.toFixed(0) || 0}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => loadRoleMenus(role)}
                                  disabled={loadingMenus}
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  Gerenciar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => applyTemplate(role)}
                                  disabled={menuTemplates.loading}
                                >
                                  <Menu className="h-4 w-4 mr-1" />
                                  Template
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Permissões */}
          <TabsContent value="permissions" className="space-y-6">
            {selectedRole && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: selectedRole.cor }} 
                      />
                      Permissões de Menu: {selectedRole.nome}
                    </CardTitle>
                    <CardDescription>
                      Ative ou desative menus específicos para este cargo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingMenus ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">
                            {roleMenus.filter(m => m.visivel).length} de {roleMenus.length} menus ativos
                          </div>
                          <Button 
                            onClick={savePermissions}
                            disabled={savingPermissions}
                          >
                            {savingPermissions ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Salvar Permissões
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {roleMenus.map(menu => (
                            <div 
                              key={menu.id} 
                              className={`border rounded-lg p-4 transition-all ${
                                menu.visivel 
                                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' 
                                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    id={`menu-${menu.id}`}
                                    checked={menu.visivel}
                                    onCheckedChange={(checked) => handleMenuToggle(menu.id, checked === true)}
                                  />
                                  <Label 
                                    htmlFor={`menu-${menu.id}`} 
                                    className="flex-1 cursor-pointer"
                                  >
                                    <div className="font-medium">{menu.nome}</div>
                                    {menu.url && (
                                      <div className="text-sm text-muted-foreground">
                                        {menu.url}
                                      </div>
                                    )}
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  {menu.visivel ? (
                                    <Eye className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 