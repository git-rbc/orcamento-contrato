'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { 
  UserPlus, 
  Search, 
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Users,
  Shield,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';

import { UserComplete, Role, CreateUserDTO } from '@/types/database';
import { gerarSenhaAutomatica, copiarParaClipboard } from '@/lib/utils';
import { useMenuTemplates, MenuTemplate } from '@/hooks/useMenuTemplates';
import { Checkbox } from '@/components/ui/checkbox';

// Schema de validação
const createUserSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  role_id: z.string().min(1, 'Selecione um cargo'),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface UserWithGeneratedPassword extends CreateUserDTO {
  generatedPassword: string;
}

export default function UsuariosPage() {
  const { userProfile, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UserComplete[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<UserWithGeneratedPassword | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  
  // Estados para preview de menus
  const [menuPreview, setMenuPreview] = useState<MenuTemplate[]>([]);
  const [showMenuPreview, setShowMenuPreview] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedRoleName, setSelectedRoleName] = useState<string>('');
  const [customMenus, setCustomMenus] = useState<MenuTemplate[]>([]);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);

  const menuTemplates = useMenuTemplates();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      nome: '',
      email: '',
      role_id: '',
    },
  });

  useEffect(() => {
    if (isAdmin) {
      fetchUsuarios();
      fetchRoles();
    }
  }, [isAdmin]);

  // Watch para mudanças no role_id selecionado
  const watchedRoleId = form.watch('role_id');

  useEffect(() => {
    if (watchedRoleId && roles.length > 0) {
      const selectedRole = roles.find(r => r.id === watchedRoleId);
      if (selectedRole) {
        setSelectedRoleId(watchedRoleId);
        setSelectedRoleName(selectedRole.nome);
        loadMenuPreview(selectedRole.nome);
      }
    } else {
      setMenuPreview([]);
      setShowMenuPreview(false);
      setSelectedRoleId('');
      setSelectedRoleName('');
    }
  }, [watchedRoleId, roles]);

  const loadMenuPreview = async (roleName: string) => {
    try {
      console.log('[USUARIOS] Carregando preview de menus para role:', roleName);
      const preview = await menuTemplates.getTemplateByRole(roleName);
      setMenuPreview(preview);
      setCustomMenus(preview); // Inicializar customMenus com o template
      setShowMenuPreview(true);
    } catch (error) {
      console.error('[USUARIOS] Erro ao carregar preview:', error);
    }
  };

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      // Gerar senha automática
      const senhaGerada = gerarSenhaAutomatica(12);
      
      const dadosUsuario: CreateUserDTO = {
        nome: data.nome,
        email: data.email,
        role_id: data.role_id,
        password: senhaGerada,
        ativo: true
      };

      console.log('[USUARIOS] Criando usuário:', dadosUsuario);

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosUsuario),
      });

      if (response.ok) {
        const novoUsuario = await response.json();
        
        // Salvar usuário criado com senha para exibir
        setCreatedUser({
          ...dadosUsuario,
          generatedPassword: senhaGerada
        });

        // Aplicar template de menus automaticamente
        if (selectedRoleId && selectedRoleName) {
          console.log('[USUARIOS] Aplicando template de menus para:', { selectedRoleId, selectedRoleName });
          
          if (useCustomPermissions && customMenus.length > 0) {
            // Usar permissões customizadas
            const customPermissions = customMenus.map(menu => ({
              menu_id: menu.id,
              visivel: menu.visivel
            }));
            
            const success = await menuTemplates.updateMenuPermissions(selectedRoleId, customPermissions);
            if (success) {
              console.log('[USUARIOS] Permissões customizadas aplicadas com sucesso');
              toast.success('Usuário criado e permissões personalizadas aplicadas!');
            } else {
              console.error('[USUARIOS] Erro ao aplicar permissões customizadas');
              toast.warning('Usuário criado, mas houve erro ao aplicar permissões personalizadas');
            }
          } else {
            // Usar template padrão
            const success = await menuTemplates.applyTemplateToRole(selectedRoleId, selectedRoleName);
            if (success) {
              console.log('[USUARIOS] Template aplicado com sucesso');
              toast.success('Usuário criado e template de menus aplicado!');
            } else {
              console.error('[USUARIOS] Erro ao aplicar template');
              toast.warning('Usuário criado, mas houve erro ao aplicar template de menus');
            }
          }
        }

        // Atualizar lista
        await fetchUsuarios();
        
        // Resetar form e estados
        form.reset();
        resetMenuStates();
        
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro inesperado ao criar usuário');
    }
  };

  const resetMenuStates = () => {
    setMenuPreview([]);
    setShowMenuPreview(false);
    setSelectedRoleId('');
    setSelectedRoleName('');
    setCustomMenus([]);
    setUseCustomPermissions(false);
  };

  const handleCloseCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(false);
    setCreatedUser(null);
    setShowPassword(false);
    setPasswordCopied(false);
    form.reset();
    resetMenuStates();
  }, [form]);

  const handleMenuToggle = (menuId: string, checked: boolean) => {
    setCustomMenus(prev => prev.map(menu => 
      menu.id === menuId ? { ...menu, visivel: checked } : menu
    ));
    setUseCustomPermissions(true);
  };

  const renderMenuPreview = () => {
    if (!showMenuPreview || menuPreview.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Prévia de Menus</Label>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="custom-permissions"
              checked={useCustomPermissions}
              onCheckedChange={(checked) => setUseCustomPermissions(checked === true)}
            />
            <Label htmlFor="custom-permissions" className="text-sm">
              Personalizar permissões
            </Label>
          </div>
        </div>
        
        <div className="border rounded-md p-3 bg-muted/30">
          <p className="text-xs text-muted-foreground mb-3">
            {useCustomPermissions 
              ? 'Edite as permissões abaixo (clique nos menus para ativar/desativar)'
              : `Template padrão para cargo "${selectedRoleName}"`
            }
          </p>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(useCustomPermissions ? customMenus : menuPreview).map(menu => (
              <div key={menu.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`menu-${menu.id}`}
                  checked={menu.visivel}
                  onCheckedChange={(checked) => handleMenuToggle(menu.id, checked === true)}
                  disabled={!useCustomPermissions}
                />
                <Label 
                  htmlFor={`menu-${menu.id}`} 
                  className={`text-sm flex-1 ${
                    useCustomPermissions ? 'cursor-pointer' : 'cursor-default'
                  } ${menu.visivel ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  <span className="flex items-center gap-2">
                    {menu.icone && <span className="text-xs">📋</span>}
                    {menu.nome}
                    {menu.visivel ? (
                      <span className="text-green-600 text-xs">✓</span>
                    ) : (
                      <span className="text-red-500 text-xs">✗</span>
                    )}
                  </span>
                </Label>
              </div>
            ))}
          </div>
          
          {useCustomPermissions && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                💡 As permissões personalizadas serão aplicadas após a criação do usuário.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const fetchUsuarios = async () => {
    try {
      setLoadingUsuarios(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data.data || []);
      } else {
        toast.error('Erro ao carregar usuários');
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await fetch('/api/admin/roles');
      if (response.ok) {
        const data = await response.json();
        // Filtrar apenas Super Admin e Vendedor
        const rolesDisponiveis = data.data?.filter((role: Role) => {
          // Manter apenas Super Admin e Vendedor
          return role.nome === 'Super Admin' || role.nome === 'Vendedor';
        }).sort((a: Role, b: Role) => {
          // Super Admin primeiro, depois Vendedor
          if (a.nome === 'Super Admin') return -1;
          if (b.nome === 'Super Admin') return 1;
          return 0;
        }) || [];
        
        setRoles(rolesDisponiveis);
      } else {
        toast.error('Erro ao carregar cargos');
      }
    } catch (error) {
      console.error('Erro ao buscar roles:', error);
      toast.error('Erro ao carregar cargos');
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleCopyPassword = async () => {
    if (createdUser?.generatedPassword) {
      const sucesso = await copiarParaClipboard(createdUser.generatedPassword);
      if (sucesso) {
        setPasswordCopied(true);
        toast.success('Senha copiada para a área de transferência!');
        setTimeout(() => setPasswordCopied(false), 3000);
      } else {
        toast.error('Erro ao copiar senha');
      }
    }
  };

  const filteredUsuarios = useMemo(() => {
    if (!searchTerm.trim()) return usuarios;
    
    return usuarios.filter(usuario =>
      usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [usuarios, searchTerm]);

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
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
            <p className="text-muted-foreground">
              Criar e gerenciar usuários do sistema
            </p>
          </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {createdUser ? 'Usuário Criado com Sucesso!' : 'Criar Novo Usuário'}
              </DialogTitle>
              <DialogDescription>
                {createdUser 
                  ? 'Anote ou copie a senha gerada para fornecer ao usuário'
                  : 'Preencha os dados para criar um novo usuário. Uma senha será gerada automaticamente.'
                }
              </DialogDescription>
            </DialogHeader>

            {createdUser ? (
              // Exibir senha gerada
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-300">
                      Usuário criado com sucesso!
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nome:</strong> {createdUser.nome}</p>
                    <p><strong>Email:</strong> {createdUser.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="generated-password">Senha Gerada</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="generated-password"
                        type={showPassword ? 'text' : 'password'}
                        value={createdUser.generatedPassword}
                        readOnly
                        className="pr-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-10 top-0 h-full px-2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPassword}
                      disabled={passwordCopied}
                    >
                      {passwordCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Anote esta senha! Ela não será exibida novamente.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={handleCloseCreateDialog}>
                    Fechar
                  </Button>
                  <Button onClick={() => setCreatedUser(null)}>
                    Criar Outro Usuário
                  </Button>
                </div>
              </div>
            ) : (
              // Formulário de criação
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="usuario@empresa.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um cargo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: role.cor }} 
                                  />
                                  {role.nome}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {roles.length > 0 
                            ? `Cargos disponíveis: ${roles.map(r => r.nome).join(', ')}`
                            : 'Carregando cargos...'
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Prévia de Menus */}
                  {renderMenuPreview()}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseCreateDialog}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        'Criar Usuário'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuários do Sistema</CardTitle>
              <CardDescription>
                {usuarios.length} usuário(s) cadastrado(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-80"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsuarios ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{usuario.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>
                        {usuario.role_info ? (
                          <Badge 
                            variant="outline"
                            style={{ 
                              backgroundColor: usuario.role_info.cor + '20',
                              borderColor: usuario.role_info.cor,
                              color: usuario.role_info.cor
                            }}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {usuario.role_info.nome}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{usuario.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={usuario.ativo ? "default" : "secondary"}>
                          {usuario.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 