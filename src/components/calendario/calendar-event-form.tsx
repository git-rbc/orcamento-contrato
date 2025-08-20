'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCalendario } from '@/hooks/useCalendario';
import type { DisponibilidadeResponse, ReservaDefinitivaPayload, ReservaTemporariaPayload, Cliente, EspacoEvento } from '@/types/calendario';

const formSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  espaco_evento_id: z.string().min(1, 'Espaço é obrigatório'),
  cliente_id: z.string().optional(),
  data_inicio: z.date({
    required_error: 'Data de início é obrigatória'
  }),
  data_fim: z.date({
    required_error: 'Data de fim é obrigatória'
  }),
  hora_inicio: z.string().min(1, 'Hora de início é obrigatória'),
  hora_fim: z.string().min(1, 'Hora de fim é obrigatória'),
  status: z.enum(['confirmado', 'pendente', 'cancelado']),
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
  criar_bloqueio: z.boolean().optional(),
  tipo_reserva: z.enum(['definitiva', 'temporaria']).default('definitiva')
});

type FormData = z.infer<typeof formSchema>;

interface CalendarEventFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ReservaDefinitivaPayload) => void;
  onSubmitTemporaria?: (data: ReservaTemporariaPayload) => Promise<void>;
  onEntrarFilaEspera?: (data: ReservaTemporariaPayload) => Promise<void>;
  espacos: EspacoEvento[];
  clientes: Cliente[];
  defaultDate?: Date | null;
  defaultValues?: Partial<ReservaDefinitivaPayload> & { id?: string };
  isEditMode?: boolean;
}

export function CalendarEventForm({
  open,
  onClose,
  onSubmit,
  onSubmitTemporaria,
  onEntrarFilaEspera,
  espacos,
  clientes,
  defaultDate,
  defaultValues,
  isEditMode = false
}: CalendarEventFormProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [disponibilidade, setDisponibilidade] = useState<DisponibilidadeResponse | null>(null);
  const { checkDisponibilidade } = useCalendario();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: defaultValues?.titulo || '',
      espaco_evento_id: defaultValues?.espaco_evento_id || '',
      cliente_id: defaultValues?.cliente_id || '',
      data_inicio: defaultValues?.data_inicio ? new Date(defaultValues.data_inicio) : defaultDate || new Date(),
      data_fim: defaultValues?.data_fim ? new Date(defaultValues.data_fim) : defaultDate || new Date(),
      hora_inicio: defaultValues?.hora_inicio || '09:00',
      hora_fim: defaultValues?.hora_fim || '18:00',
      status: defaultValues?.status || 'pendente',
      descricao: defaultValues?.descricao || '',
      observacoes: defaultValues?.observacoes || '',
      criar_bloqueio: false,
      tipo_reserva: 'definitiva'
    }
  });

  const watchEspaco = form.watch('espaco_evento_id');
  const watchDataInicio = form.watch('data_inicio');
  const watchDataFim = form.watch('data_fim');
  const watchTipoReserva = form.watch('tipo_reserva');

  // Verificar disponibilidade quando mudar espaço ou datas
  useEffect(() => {
    const verificar = async () => {
      if (watchEspaco && watchDataInicio && watchDataFim) {
        setIsChecking(true);
        try {
          const result = await checkDisponibilidade(
            watchEspaco,
            watchDataInicio,
            watchDataFim,
            isEditMode ? defaultValues?.id : undefined
          );
          setDisponibilidade(result);
        } catch (error) {
          console.error('Erro ao verificar disponibilidade:', error);
        } finally {
          setIsChecking(false);
        }
      }
    };

    verificar();
  }, [watchEspaco, watchDataInicio, watchDataFim]);

  const handleSubmit = async (data: FormData) => {
    // Validar datas
    if (data.data_fim < data.data_inicio) {
      toast.error('A data de fim não pode ser anterior à data de início');
      return;
    }

    // Validar horários
    if (data.data_inicio.getTime() === data.data_fim.getTime() && data.hora_fim <= data.hora_inicio) {
      toast.error('A hora de fim deve ser posterior à hora de início');
      return;
    }

    const baseData = {
      espaco_evento_id: data.espaco_evento_id,
      data_inicio: format(data.data_inicio, 'yyyy-MM-dd'),
      data_fim: format(data.data_fim, 'yyyy-MM-dd'),
      hora_inicio: data.hora_inicio,
      hora_fim: data.hora_fim,
      cliente_id: data.cliente_id || null,
      descricao: data.descricao || null,
      observacoes: data.observacoes || null
    };

    // Se for reserva temporária
    if (data.tipo_reserva === 'temporaria') {
      // Verificar disponibilidade primeiro
      if (!isEditMode && disponibilidade && !disponibilidade.disponivel) {
        toast.error('Espaço não disponível! Deseja entrar na fila de espera?', {
          action: {
            label: 'Entrar na Fila',
            onClick: async () => {
              if (onEntrarFilaEspera) {
                try {
                  await onEntrarFilaEspera(baseData);
                  onClose();
                } catch (error) {
                  console.error('Erro ao entrar na fila:', error);
                }
              }
            }
          }
        });
        return;
      }

      if (onSubmitTemporaria) {
        try {
          await onSubmitTemporaria(baseData);
          onClose();
        } catch (error) {
          console.error('Erro ao criar reserva temporária:', error);
        }
      }
      return;
    }

    // Reserva definitiva
    // Verificar disponibilidade antes de salvar
    if (!isEditMode && disponibilidade && !disponibilidade.disponivel) {
      toast.error('O espaço não está disponível no período selecionado');
      return;
    }

    // Adicionar campos específicos para reserva definitiva
    const reservaDefinitiva: ReservaDefinitivaPayload = {
      ...baseData,
      titulo: data.titulo,
      status: data.status
    };

    // Remover propriedades undefined e vazias
    (Object.keys(reservaDefinitiva) as (keyof ReservaDefinitivaPayload)[]).forEach(key => {
      if (reservaDefinitiva[key] === undefined || reservaDefinitiva[key] === '') {
        delete reservaDefinitiva[key];
      }
    });

    onSubmit(reservaDefinitiva);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar Reserva' : 'Nova Reserva'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
                <TabsTrigger value="additional">Informações Adicionais</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Tipo de Reserva */}
                {!isEditMode && (
                  <FormField
                    control={form.control}
                    name="tipo_reserva"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Reserva</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="definitiva">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                <div>
                                  <p className="font-medium">Reserva Definitiva</p>
                                  <p className="text-xs text-muted-foreground">Reserva confirmada no calendário</p>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="temporaria">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                                <div>
                                  <p className="font-medium">Reserva Temporária</p>
                                  <p className="text-xs text-muted-foreground">48 horas para conversão</p>
                                </div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {watchTipoReserva === 'temporaria' 
                            ? 'Reserva por 48 horas com possibilidade de conversão em proposta'
                            : 'Reserva confirmada diretamente no calendário'
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Título - Só para reservas definitivas */}
                {(isEditMode || watchTipoReserva === 'definitiva') && (
                  <FormField
                    control={form.control}
                    name="titulo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título do Evento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Casamento João e Maria" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Espaço */}
                <FormField
                  control={form.control}
                  name="espaco_evento_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Espaço</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um espaço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {espacos.map((espaco) => (
                            <SelectItem key={espaco.id} value={espaco.id}>
                              {espaco.nome}
                              {espaco.capacidade_maxima && ` (Capacidade: ${espaco.capacidade_maxima})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cliente */}
                <FormField
                  control={form.control}
                  name="cliente_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientes.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome}
                              {cliente.cpf_cnpj && ` - ${cliente.cpf_cnpj}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* Data Início */}
                  <FormField
                    control={form.control}
                    name="data_inicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy')
                                ) : (
                                  <span>Selecione uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Data Fim */}
                  <FormField
                    control={form.control}
                    name="data_fim"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Fim</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy')
                                ) : (
                                  <span>Selecione uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < form.getValues('data_inicio')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Hora Início */}
                  <FormField
                    control={form.control}
                    name="hora_inicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de Início</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="time" {...field} />
                            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hora Fim */}
                  <FormField
                    control={form.control}
                    name="hora_fim"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de Fim</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="time" {...field} />
                            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Status - Só para reservas definitivas */}
                {(isEditMode || watchTipoReserva === 'definitiva') && (
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="confirmado">Confirmado</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Alerta de Disponibilidade */}
                {!isChecking && disponibilidade && !disponibilidade.disponivel && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      O espaço não está disponível no período selecionado.
                      {disponibilidade.conflitos.reservas > 0 && (
                        <span> Existem {disponibilidade.conflitos.reservas} reserva(s) conflitante(s).</span>
                      )}
                      {disponibilidade.conflitos.bloqueios > 0 && (
                        <span> Existem {disponibilidade.conflitos.bloqueios} bloqueio(s) no período.</span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {!isChecking && disponibilidade && disponibilidade.disponivel && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      O espaço está disponível no período selecionado.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="additional" className="space-y-4 mt-4">
                {/* Descrição */}
                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalhes sobre o evento..."
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Observações */}
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Internas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações para a equipe..."
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Essas informações são apenas para uso interno.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Criar Bloqueio */}
                {!isEditMode && (
                  <FormField
                    control={form.control}
                    name="criar_bloqueio"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Bloquear datas adjacentes
                          </FormLabel>
                          <FormDescription>
                            Bloqueia um dia antes e depois do evento para preparação e limpeza
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditMode ? 'Salvar Alterações' : 'Criar Reserva'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}