'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays, addHours } from 'date-fns';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, AlertCircle, Clock, Timer, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCalendario } from '@/hooks/useCalendario';
import { useEspacosEventos } from '@/hooks/useEspacosEventos';
import { useClientes } from '@/hooks/useClientes';
import type { EspacoEvento, Cliente } from '@/types/database';
import type { DisponibilidadeResponse, ReservaTemporariaPayload } from '@/types/calendario';

const formSchema = z.object({
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
  descricao: z.string().optional(),
  observacoes: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface ReservaTemporariaFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ReservaTemporariaPayload & { status: string; expira_em: string; }) => Promise<void>;
  defaultDate?: Date | null;
  espacoId?: string;
}

export function ReservaTemporariaForm({
  open,
  onClose,
  onSubmit,
  defaultDate,
  espacoId
}: ReservaTemporariaFormProps) {
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [disponibilidade, setDisponibilidade] = useState<DisponibilidadeResponse | null>(null);

  const { checkDisponibilidade } = useCalendario();
  const { espacos } = useEspacosEventos();
  const { data: clientesData } = useClientes();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      espaco_evento_id: espacoId || '',
      cliente_id: '',
      data_inicio: defaultDate || new Date(),
      data_fim: defaultDate || new Date(),
      hora_inicio: '09:00',
      hora_fim: '18:00',
      descricao: '',
      observacoes: ''
    }
  });

  const watchEspaco = form.watch('espaco_evento_id');
  const watchDataInicio = form.watch('data_inicio');
  const watchDataFim = form.watch('data_fim');


  // Verificar disponibilidade quando mudar espaço ou datas
  useEffect(() => {
    const verificar = async () => {
      if (watchEspaco && watchDataInicio && watchDataFim) {
        setIsChecking(true);
        try {
          const result = await checkDisponibilidade(
            watchEspaco,
            watchDataInicio,
            watchDataFim
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

    // Verificar disponibilidade antes de salvar
    if (disponibilidade && !disponibilidade.disponivel) {
      toast.error('O espaço não está disponível no período selecionado');
      return;
    }

    setLoading(true);
    try {
      // Calcular data de expiração (48 horas a partir de agora)
      const now = new Date();
      const expiraEm = addHours(now, 48);

      const formattedData = {
        espaco_evento_id: data.espaco_evento_id,
        cliente_id: data.cliente_id || null,
        data_inicio: format(data.data_inicio, 'yyyy-MM-dd'),
        data_fim: format(data.data_fim, 'yyyy-MM-dd'),
        hora_inicio: data.hora_inicio,
        hora_fim: data.hora_fim,
        descricao: data.descricao || null,
        observacoes: data.observacoes || null,
        status: 'ativa',
        expira_em: expiraEm.toISOString()
      };

      await onSubmit(formattedData);
      onClose();
      form.reset();
      toast.success('Reserva temporária criada com sucesso! Válida por 48 horas.');
    } catch (error) {
      console.error('Erro ao criar reserva temporária:', error);
      toast.error('Erro ao criar reserva temporária');
    } finally {
      setLoading(false);
    }
  };

  // Calcular expiração para display
  const getExpirationInfo = () => {
    const now = new Date();
    const expires = addHours(now, 48);
    return {
      date: format(expires, 'dd/MM/yyyy'),
      time: format(expires, 'HH:mm')
    };
  };

  const expirationInfo = getExpirationInfo();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Nova Reserva Temporária
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Info sobre expiração */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p><strong>Reserva Temporária:</strong> Válida por 48 horas</p>
                  <p className="text-sm text-muted-foreground">
                    Expirará em: <strong>{expirationInfo.date} às {expirationInfo.time}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Você pode converter em proposta ou liberar antes do prazo.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

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
                      {espacos?.map((espaco) => (
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
                      {clientesData?.data?.map((cliente) => (
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

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes sobre o evento..."
                      className="resize-none"
                      rows={3}
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
                  <FormLabel>Observações Internas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações para a equipe..."
                      className="resize-none"
                      rows={3}
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

            {/* Alerta de Disponibilidade */}
            {isChecking && (
              <Alert>
                <AlertCircle className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Verificando disponibilidade...
                </AlertDescription>
              </Alert>
            )}

            {!isChecking && disponibilidade && !disponibilidade.disponivel && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Espaço não disponível no período selecionado!</strong></p>
                    {disponibilidade.conflitos.reservas > 0 && (
                      <p>• {disponibilidade.conflitos.reservas} reserva(s) conflitante(s)</p>
                    )}
                    {disponibilidade.conflitos.bloqueios > 0 && (
                      <p>• {disponibilidade.conflitos.bloqueios} bloqueio(s) no período</p>
                    )}
                    <p className="text-sm">
                      <strong>Sugestão:</strong> Escolha outro horário ou entre na fila de espera.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!isChecking && disponibilidade && disponibilidade.disponivel && (
              <Alert className="border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  ✅ O espaço está disponível no período selecionado.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading || Boolean(disponibilidade && !disponibilidade.disponivel)}
              >
                {loading ? 'Criando...' : 'Criar Reserva Temporária'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}