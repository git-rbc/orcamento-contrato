'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


import { 
  Shield, 
  Users, 
  Save,
  RefreshCw,
  Settings,
  Plus,
  Edit,
  Trash2,
  UserPlus
} from 'lucide-react';

interface Role {
  id: string;
  nome: string;
  descricao: string;
  cor: string;
  nivel_hierarquia: number;
  ativo: boolean;
  sistema: boolean;
}

interface Menu {
  id: string;
  nome: string;
  slug: string;
  icone: string;
  url: string;
  ordem: number;
  visivel: boolean;
  children?: Menu[];
}

interface CreateRoleForm {
  nome: string;
  descricao: string;
  cor: string;
  nivel_hierarquia: number;
}

export default function RolesPage() {
  const { userProfile, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados para criação/edição de roles
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [createForm, setCreateForm] = useState<CreateRoleForm>({
    nome: '',
    descricao: '',
    cor: '#6B7280',
    nivel_hierarquia: 50
  });

  const coresDisponiveis = [
    { value: '#DC2626', label: 'Vermelho', name: 'Vermelho' },
    { value: '#EA580C', label: 'Laranja', name: 'Laranja' },
    { value: '#D97706', label: 'Âmbar', name: 'Âmbar' },
    { value: '#059669', label: 'Verde', name: 'Verde' },
    { value: '#0891B2', label: 'Ciano', name: 'Ciano' },
    { value: '#2563EB', label: 'Azul', name: 'Azul' },
    { value: '#7C3AED', label: 'Roxo', name: 'Roxo' },
    { value: '#C2410C', label: 'Marrom', name: 'Marrom' },
    { value: '#6B7280', label: 'Cinza', name: 'Cinza' },
  ];

  useEffect(() => {
    if (isAdmin) {
      fetchRoles();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedRole) {
      fetchMenuPermissions(selectedRole);
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await fetch('/api/admin/roles?includeSystem=true');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.data || []);
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

  const fetchMenuPermissions = async (roleId: string) => {
    try {
      setLoadingMenus(true);
      
      const response = await fetch(`/api/admin/menus/permissions?roleId=${roleId}`);
      if (response.ok) {
        const data = await response.json();
        let menuData = data.data || [];
        
        // Se for role Admin e não há permissões configuradas, marcar todos como visíveis por padrão
        const selectedRoleData = roles.find(r => r.id === roleId);
        const isAdminRole = (selectedRoleData?.nivel_hierarquia ?? 0) >= 80;
        
        if (isAdminRole) {
          // Verificar se há alguma configuração salva
          const hasAnyConfiguration = menuData.some((menu: any) => 
            menu.visivel || (menu.children && menu.children.some((child: any) => child.visivel))
          );
          
          // Se não há configuração para Admin, marcar todos como visíveis por padrão
          if (!hasAnyConfiguration) {
            menuData = menuData.map((menu: any) => ({
              ...menu,
              visivel: true,
              children: menu.children ? menu.children.map((child: any) => ({
                ...child,
                visivel: true
              })) : undefined
            }));
          }
        }
        
        setMenus(menuData);
      } else {
        toast.error('Erro ao carregar permissões de menus');
      }
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      toast.error('Erro ao carregar permissões');
    } finally {
      setLoadingMenus(false);
    }
  };

  const handleMenuToggle = (menuId: string, checked: boolean) => {
    const updateMenus = (menuList: Menu[]): Menu[] => {
      return menuList.map(menu => {
        if (menu.id === menuId) {
          return { ...menu, visivel: checked };
        }
        if (menu.children) {
          return { ...menu, children: updateMenus(menu.children) };
        }
        return menu;
      });
    };

    setMenus(updateMenus(menus));
  };

  const savePermissions = async () => {
    if (!selectedRole) {
      toast.error('Selecione uma role');
      return;
    }

    try {
      setSaving(true);
      
      // Coletar todas as permissões (incluindo submenus)
      const collectPermissions = (menuList: Menu[]): { menu_id: string; visivel: boolean }[] => {
        let permissions: { menu_id: string; visivel: boolean }[] = [];
        
        menuList.forEach(menu => {
          permissions.push({ menu_id: menu.id, visivel: menu.visivel });
          if (menu.children) {
            permissions = permissions.concat(collectPermissions(menu.children));
          }
        });
        
        return permissions;
      };

      const permissions = collectPermissions(menus);

      const response = await fetch('/api/admin/menus/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: selectedRole,
          menus: permissions
        })
      });

      if (response.ok) {
        toast.success('Permissões salvas com sucesso!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar permissões');
      }
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      toast.error('Erro inesperado ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!createForm.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        toast.success('Role criado com sucesso!');
        setShowCreateDialog(false);
        setCreateForm({
          nome: '',
          descricao: '',
          cor: '#6B7280',
          nivel_hierarquia: 50
        });
        fetchRoles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar role');
      }
    } catch (error) {
      console.error('Erro ao criar role:', error);
      toast.error('Erro inesperado ao criar role');
    }
  };

  const handleEditRole = async () => {
    if (!editingRole) return;

    try {
      const response = await fetch(`/api/admin/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: editingRole.nome,
          descricao: editingRole.descricao,
          cor: editingRole.cor,
          nivel_hierarquia: editingRole.nivel_hierarquia
        })
      });

      if (response.ok) {
        toast.success('Role atualizado com sucesso!');
        setShowEditDialog(false);
        setEditingRole(null);
        fetchRoles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar role');
      }
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      toast.error('Erro inesperado ao atualizar role');
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;

    try {
      const response = await fetch(`/api/admin/roles/${deletingRole.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Role excluído com sucesso!');
        setShowDeleteDialog(false);
        setDeletingRole(null);
        if (selectedRole === deletingRole.id) {
          setSelectedRole('');
        }
        fetchRoles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao excluir role');
      }
    } catch (error) {
      console.error('Erro ao excluir role:', error);
      toast.error('Erro inesperado ao excluir role');
    }
  };

  const renderMenu = (menu: Menu, level: number = 0) => {
    const paddingLeft = level * 20;
    
    return (
      <div key={menu.id} className="space-y-2">
        <div 
          className="flex items-center space-x-3 p-3 rounded-lg border"
          style={{ paddingLeft: `${paddingLeft + 12}px` }}
        >
          <Checkbox
            id={menu.id}
            checked={menu.visivel}
            onCheckedChange={(checked) => handleMenuToggle(menu.id, !!checked)}
          />
          <div className="flex-1">
            <label 
              htmlFor={menu.id}
              className="text-sm font-medium cursor-pointer"
            >
              {menu.nome}
            </label>
            {menu.url && (
              <p className="text-xs text-muted-foreground">{menu.url}</p>
            )}
          </div>
          <Badge variant={menu.visivel ? "default" : "secondary"}>
            {menu.visivel ? 'Visível' : 'Oculto'}
          </Badge>
        </div>
        
        {menu.children && menu.children.map(child => renderMenu(child, level + 1))}
      </div>
    );
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Roles & Permissões</h1>
            <p className="text-muted-foreground">
              Gerencie os cargos do sistema e configure suas permissões de acesso
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Role
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lista de Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Roles Disponíveis
              </CardTitle>
              <CardDescription>
                Selecione uma role para configurar suas permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingRoles ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  roles.map((role) => (
                    <div
                      key={role.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRole === role.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedRole(role.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: role.cor }} 
                          />
                          <span className="text-sm font-medium">{role.nome}</span>
                        </div>
                        
                        {!role.sistema && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRole(role);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingRole(role);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {role.descricao}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Nível {role.nivel_hierarquia}
                        </Badge>
                        {role.sistema && (
                          <Badge variant="secondary" className="text-xs">
                            Sistema
                          </Badge>
                        )}
                        {!role.ativo && (
                          <Badge variant="destructive" className="text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Configuração de Permissões */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Permissões de Menus
                  </CardTitle>
                  <CardDescription>
                    Configure quais menus são visíveis para a role selecionada
                  </CardDescription>
                </div>
                {selectedRole && (
                  <Button 
                    onClick={savePermissions}
                    disabled={saving || loadingMenus}
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Permissões
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedRole ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Selecione uma role para configurar suas permissões</p>
                </div>
              ) : loadingMenus ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {menus.map(menu => renderMenu(menu))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dialog Criar Role */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Role</DialogTitle>
              <DialogDescription>
                Crie uma nova role para o sistema
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={createForm.nome}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome da role"
                />
              </div>
              
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={createForm.descricao}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição da role"
                />
              </div>
              
              <div>
                <Label htmlFor="cor">Cor</Label>
                <Select 
                  value={createForm.cor} 
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, cor: value }))}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: createForm.cor }} 
                        />
                        {coresDisponiveis.find(c => c.value === createForm.cor)?.name || 'Selecionar cor'}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {coresDisponiveis.map((cor) => (
                      <SelectItem key={cor.value} value={cor.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: cor.value }} 
                          />
                          {cor.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="nivel">Nível Hierárquico</Label>
                <Input
                  id="nivel"
                  type="number"
                  min="1"
                  max="99"
                  value={createForm.nivel_hierarquia}
                  onChange={(e) => setCreateForm(prev => ({ 
                    ...prev, 
                    nivel_hierarquia: parseInt(e.target.value) || 50 
                  }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Níveis mais altos têm mais privilégios (1-99)
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateRole}>
                <UserPlus className="h-4 w-4 mr-2" />
                Criar Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Editar Role */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Role</DialogTitle>
              <DialogDescription>
                Modifique as informações da role
              </DialogDescription>
            </DialogHeader>
            
            {editingRole && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-nome">Nome</Label>
                  <Input
                    id="edit-nome"
                    value={editingRole.nome}
                    onChange={(e) => setEditingRole(prev => prev ? { ...prev, nome: e.target.value } : null)}
                    placeholder="Nome da role"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-descricao">Descrição</Label>
                  <Textarea
                    id="edit-descricao"
                    value={editingRole.descricao}
                    onChange={(e) => setEditingRole(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                    placeholder="Descrição da role"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-cor">Cor</Label>
                  <Select 
                    value={editingRole.cor} 
                    onValueChange={(value) => setEditingRole(prev => prev ? { ...prev, cor: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: editingRole.cor }} 
                          />
                          {coresDisponiveis.find(c => c.value === editingRole.cor)?.name || 'Selecionar cor'}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {coresDisponiveis.map((cor) => (
                        <SelectItem key={cor.value} value={cor.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: cor.value }} 
                            />
                            {cor.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-nivel">Nível Hierárquico</Label>
                  <Input
                    id="edit-nivel"
                    type="number"
                    min="1"
                    max="99"
                    value={editingRole.nivel_hierarquia}
                    onChange={(e) => setEditingRole(prev => prev ? { 
                      ...prev, 
                      nivel_hierarquia: parseInt(e.target.value) || 50 
                    } : null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Níveis mais altos têm mais privilégios (1-99)
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditRole}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Confirmar Exclusão */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a role "{deletingRole?.nome}"? 
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleDeleteRole}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
} 