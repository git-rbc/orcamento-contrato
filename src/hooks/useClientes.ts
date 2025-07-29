import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClienteClientService } from '@/services/clientes-client'
import { Cliente, ClienteFilters, CreateClienteDTO, UpdateClienteDTO } from '@/types/database'
import { toast } from 'sonner'

// Keys para organizar o cache
export const clienteKeys = {
  all: ['clientes'] as const,
  lists: () => [...clienteKeys.all, 'list'] as const,
  list: (filters: ClienteFilters) => [...clienteKeys.lists(), filters] as const,
  details: () => [...clienteKeys.all, 'detail'] as const,
  detail: (id: string) => [...clienteKeys.details(), id] as const,
  stats: () => [...clienteKeys.all, 'stats'] as const,
  search: (termo: string) => [...clienteKeys.all, 'search', termo] as const,
}

// Hook para listar clientes com cache otimizado
export function useClientes(
  filters: ClienteFilters = {},
  page: number = 1,
  limit: number = 10
) {
  return useQuery({
    queryKey: clienteKeys.list({ ...filters, page, limit }),
    queryFn: async () => {
      try {
        const result = await ClienteClientService.listar(filters, page, limit);
        // Garantir estrutura válida
        return {
          data: result.data || [],
          total: result.total || 0,
          page: result.page || page,
          limit: result.limit || limit,
          totalPages: result.totalPages || 0
        };
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        // Retornar estrutura vazia em caso de erro
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        };
      }
    },
    // Cache mais longo para listas estáticas
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    // Retry em caso de erro
    retry: 2,
  })
}

// Hook para buscar cliente por ID
export function useCliente(id: string | null) {
  return useQuery({
    queryKey: clienteKeys.detail(id || ''),
    queryFn: () => id ? ClienteClientService.buscarPorId(id) : null,
    enabled: !!id,
    // Cache mais longo para detalhes específicos
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para buscar clientes para select (cache mais longo)
export function useClientesSelect(termo: string = '', limite: number = 10) {
  return useQuery({
    queryKey: clienteKeys.search(termo),
    queryFn: () => ClienteClientService.buscarParaSelect(termo, limite),
    // Cache muito longo para autocomplete
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    // Debounce automático - só busca se termo mudou
    enabled: termo.length >= 0,
  })
}

// Hook para estatísticas (cache longo)
export function useClientesStats() {
  return useQuery({
    queryKey: clienteKeys.stats(),
    queryFn: async () => {
      try {
        const stats = await ClienteClientService.obterEstatisticas();
        // Garantir que nunca retorna undefined
        return stats || {
          total: 0,
          ativos: 0,
          inativos: 0,
          pessoas_fisicas: 0,
          empresas: 0,
          comContratos: 0
        };
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        // Retornar dados padrão em caso de erro
        return {
          total: 0,
          ativos: 0,
          inativos: 0,
          pessoas_fisicas: 0,
          empresas: 0,
          comContratos: 0
        };
      }
    },
    // Cache muito longo para estatísticas
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    // Retry em caso de erro
    retry: 2,
  })
}

// Hook para criar cliente
export function useCreateCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateClienteDTO) => ClienteClientService.criar(data),
    onSuccess: (novoCliente) => {
      // Invalidar listas para refetch
      queryClient.invalidateQueries({ queryKey: clienteKeys.lists() })
      queryClient.invalidateQueries({ queryKey: clienteKeys.stats() })
      
      // Adicionar ao cache de detalhes
      queryClient.setQueryData(
        clienteKeys.detail(novoCliente.id),
        novoCliente
      )

      toast.success('Cliente criado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar cliente: ${error.message}`)
    },
  })
}

// Hook para atualizar cliente
export function useUpdateCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClienteDTO }) =>
      ClienteClientService.atualizar(id, data),
    onSuccess: (clienteAtualizado, variables) => {
      // Atualizar cache de detalhes
      queryClient.setQueryData(
        clienteKeys.detail(variables.id),
        clienteAtualizado
      )

      // Invalidar listas para refetch
      queryClient.invalidateQueries({ queryKey: clienteKeys.lists() })
      queryClient.invalidateQueries({ queryKey: clienteKeys.stats() })

      toast.success('Cliente atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar cliente: ${error.message}`)
    },
  })
}

// Hook para excluir cliente
export function useDeleteCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => ClienteClientService.excluir(id),
    onSuccess: (_, clienteId) => {
      // Remover do cache de detalhes
      queryClient.removeQueries({ queryKey: clienteKeys.detail(clienteId) })

      // Invalidar listas para refetch
      queryClient.invalidateQueries({ queryKey: clienteKeys.lists() })
      queryClient.invalidateQueries({ queryKey: clienteKeys.stats() })

      toast.success('Cliente excluído com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir cliente: ${error.message}`)
    },
  })
}

// Hook para ativar/desativar cliente
export function useToggleCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      ativo ? ClienteClientService.ativar(id) : ClienteClientService.desativar(id),
    onSuccess: (clienteAtualizado, variables) => {
      // Atualizar cache de detalhes
      queryClient.setQueryData(
        clienteKeys.detail(variables.id),
        clienteAtualizado
      )

      // Invalidar listas para refetch
      queryClient.invalidateQueries({ queryKey: clienteKeys.lists() })
      queryClient.invalidateQueries({ queryKey: clienteKeys.stats() })

      const acao = variables.ativo ? 'ativado' : 'desativado'
      toast.success(`Cliente ${acao} com sucesso!`)
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar status do cliente: ${error.message}`)
    },
  })
} 