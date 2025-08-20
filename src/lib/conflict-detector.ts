import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
import { notificationService } from './notification-service';

export interface ConflictData {
  reuniao_id: string;
  vendedor_id: string;
  vendedor_nome: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  conflitos: Array<{
    reuniao_id: string;
    titulo: string;
    hora_inicio: string;
    hora_fim: string;
    cliente_nome?: string;
  }>;
}

class ConflictDetector {
  // Verificar conflitos para uma reunião específica
  async verificarConflitoReuniao(
    vendedorId: string,
    data: string,
    horaInicio: string,
    horaFim: string,
    reuniaoIdExcluir?: string
  ): Promise<ConflictData | null> {
    try {
      // Query para buscar reuniões do vendedor na mesma data
      let query = supabase
        .from('v_reunioes_completa')
        .select(`
          id,
          titulo,
          hora_inicio,
          hora_fim,
          cliente_nome,
          vendedor_id,
          vendedor_nome
        `)
        .eq('vendedor_id', vendedorId)
        .eq('data', data)
        .eq('status', 'agendada');

      // Excluir a própria reunião se estiver editando
      if (reuniaoIdExcluir) {
        query = query.neq('id', reuniaoIdExcluir);
      }

      const { data: reunioesExistentes, error } = await query;

      if (error) {
        console.error('Erro ao verificar conflitos:', error);
        return null;
      }

      if (!reunioesExistentes || reunioesExistentes.length === 0) {
        return null; // Sem conflitos
      }

      // Verificar sobreposição de horários
      const conflitos = reunioesExistentes.filter(reuniao => {
        return this.verificarSobreposicaoHorarios(
          horaInicio,
          horaFim,
          reuniao.hora_inicio,
          reuniao.hora_fim
        );
      });

      if (conflitos.length === 0) {
        return null; // Sem conflitos
      }

      // Retornar dados do conflito
      const vendedorInfo = reunioesExistentes[0];
      return {
        reuniao_id: reuniaoIdExcluir || 'nova',
        vendedor_id: vendedorId,
        vendedor_nome: vendedorInfo.vendedor_nome,
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        conflitos: conflitos.map(conflito => ({
          reuniao_id: conflito.id,
          titulo: conflito.titulo,
          hora_inicio: conflito.hora_inicio,
          hora_fim: conflito.hora_fim,
          cliente_nome: conflito.cliente_nome
        }))
      };

    } catch (error) {
      console.error('Erro ao verificar conflitos:', error);
      return null;
    }
  }

  // Verificar sobreposição entre dois intervalos de tempo
  private verificarSobreposicaoHorarios(
    inicio1: string,
    fim1: string,
    inicio2: string,
    fim2: string
  ): boolean {
    // Converter horários para minutos para facilitar comparação
    const minutosInicio1 = this.horarioParaMinutos(inicio1);
    const minutosFim1 = this.horarioParaMinutos(fim1);
    const minutosInicio2 = this.horarioParaMinutos(inicio2);
    const minutosFim2 = this.horarioParaMinutos(fim2);

    // Verificar sobreposição
    return minutosInicio1 < minutosFim2 && minutosInicio2 < minutosFim1;
  }

  // Converter horário HH:MM para minutos
  private horarioParaMinutos(horario: string): number {
    const [horas, minutos] = horario.split(':').map(Number);
    return horas * 60 + minutos;
  }

  // Verificar todos os conflitos do sistema
  async verificarTodosConflitos(): Promise<ConflictData[]> {
    try {
      // Buscar todas as reuniões agendadas para os próximos 30 dias
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() + 30);

      const { data: reunioes, error } = await supabase
        .from('v_reunioes_completa')
        .select(`
          id,
          vendedor_id,
          vendedor_nome,
          data,
          hora_inicio,
          hora_fim,
          titulo,
          cliente_nome
        `)
        .eq('status', 'agendada')
        .gte('data', new Date().toISOString().split('T')[0])
        .lte('data', dataLimite.toISOString().split('T')[0])
        .order('vendedor_id')
        .order('data')
        .order('hora_inicio');

      if (error || !reunioes) {
        console.error('Erro ao buscar reuniões:', error);
        return [];
      }

      const conflitos: ConflictData[] = [];
      const reunioesProcessadas = new Set<string>();

      // Agrupar reuniões por vendedor e data
      const reunioesPorVendedorData = reunioes.reduce((acc: Record<string, any[]>, reuniao: any) => {
        const chave = `${reuniao.vendedor_id}_${reuniao.data}`;
        if (!acc[chave]) acc[chave] = [];
        acc[chave].push(reuniao);
        return acc;
      }, {} as Record<string, any[]>);

      // Verificar conflitos dentro de cada grupo
      for (const [chave, reunioesGrupo] of Object.entries(reunioesPorVendedorData)) {
        if ((reunioesGrupo as any[]).length < 2) continue;

        for (let i = 0; i < (reunioesGrupo as any[]).length; i++) {
          for (let j = i + 1; j < (reunioesGrupo as any[]).length; j++) {
            const reuniao1 = (reunioesGrupo as any[])[i];
            const reuniao2 = (reunioesGrupo as any[])[j];

            // Evitar processar o mesmo conflito duas vezes
            const conflictKey = [reuniao1.id, reuniao2.id].sort().join('_');
            if (reunioesProcessadas.has(conflictKey)) continue;

            if (this.verificarSobreposicaoHorarios(
              reuniao1.hora_inicio,
              reuniao1.hora_fim,
              reuniao2.hora_inicio,
              reuniao2.hora_fim
            )) {
              conflitos.push({
                reuniao_id: reuniao1.id,
                vendedor_id: reuniao1.vendedor_id,
                vendedor_nome: reuniao1.vendedor_nome,
                data: reuniao1.data,
                hora_inicio: reuniao1.hora_inicio,
                hora_fim: reuniao1.hora_fim,
                conflitos: [{
                  reuniao_id: reuniao2.id,
                  titulo: reuniao2.titulo,
                  hora_inicio: reuniao2.hora_inicio,
                  hora_fim: reuniao2.hora_fim,
                  cliente_nome: reuniao2.cliente_nome
                }]
              });

              reunioesProcessadas.add(conflictKey);
            }
          }
        }
      }

      return conflitos;

    } catch (error) {
      console.error('Erro ao verificar todos os conflitos:', error);
      return [];
    }
  }

  // Notificar conflitos encontrados
  async notificarConflitos(conflitos: ConflictData[]): Promise<void> {
    try {
      // Buscar IDs dos administradores
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      const adminIds = admins?.map((admin: any) => admin.id) || [];

      for (const conflito of conflitos) {
        // Notificar vendedor
        await notificationService.notificarConflito(
          conflito.vendedor_id,
          adminIds,
          conflito
        );
      }
    } catch (error) {
      console.error('Erro ao notificar conflitos:', error);
    }
  }

  // Job para verificação periódica de conflitos
  async executarVerificacaoPeriodica(): Promise<void> {
    try {
      const conflitos = await this.verificarTodosConflitos();
      
      if (conflitos.length > 0) {
        console.log(`Encontrados ${conflitos.length} conflitos de agenda`);
        await this.notificarConflitos(conflitos);
      }
    } catch (error) {
      console.error('Erro na verificação periódica de conflitos:', error);
    }
  }

  // Validar agendamento antes de salvar
  async validarAgendamento(
    vendedorId: string,
    data: string,
    horaInicio: string,
    horaFim: string,
    reuniaoIdExcluir?: string
  ): Promise<{ valido: boolean; conflito?: ConflictData; mensagem?: string }> {
    try {
      // Verificar se o horário é válido
      const minutosInicio = this.horarioParaMinutos(horaInicio);
      const minutosFim = this.horarioParaMinutos(horaFim);

      if (minutosInicio >= minutosFim) {
        return {
          valido: false,
          mensagem: 'Horário de início deve ser anterior ao horário de fim'
        };
      }

      // Verificar conflitos
      const conflito = await this.verificarConflitoReuniao(
        vendedorId,
        data,
        horaInicio,
        horaFim,
        reuniaoIdExcluir
      );

      if (conflito) {
        return {
          valido: false,
          conflito,
          mensagem: `Conflito detectado com ${conflito.conflitos.length} reunião(ões) existente(s)`
        };
      }

      return { valido: true };

    } catch (error) {
      console.error('Erro ao validar agendamento:', error);
      return {
        valido: false,
        mensagem: 'Erro interno ao validar agendamento'
      };
    }
  }

  // Sugerir horários alternativos
  async sugerirHorariosAlternativos(
    vendedorId: string,
    data: string,
    duracao: number // em minutos
  ): Promise<Array<{ hora_inicio: string; hora_fim: string }>> {
    try {
      // Buscar reuniões existentes do vendedor na data
      const { data: reunioesExistentes } = await supabase
        .from('v_reunioes_completa')
        .select('hora_inicio, hora_fim')
        .eq('vendedor_id', vendedorId)
        .eq('data', data)
        .eq('status', 'agendada')
        .order('hora_inicio');

      // Horário comercial: 8h às 18h
      const horarioComercialInicio = 8 * 60; // 8:00 em minutos
      const horarioComercialFim = 18 * 60; // 18:00 em minutos

      const horariosOcupados = (reunioesExistentes || []).map(reuniao => ({
        inicio: this.horarioParaMinutos(reuniao.hora_inicio),
        fim: this.horarioParaMinutos(reuniao.hora_fim)
      }));

      const sugestoes: Array<{ hora_inicio: string; hora_fim: string }> = [];
      
      // Encontrar slots livres
      let horaAtual = horarioComercialInicio;
      
      while (horaAtual + duracao <= horarioComercialFim) {
        const horaFim = horaAtual + duracao;
        
        // Verificar se não há conflito com reuniões existentes
        const temConflito = horariosOcupados.some((ocupado: any) => 
          horaAtual < ocupado.fim && ocupado.inicio < horaFim
        );

        if (!temConflito) {
          sugestoes.push({
            hora_inicio: this.minutosParaHorario(horaAtual),
            hora_fim: this.minutosParaHorario(horaFim)
          });
        }

        horaAtual += 30; // Incrementar de 30 em 30 minutos
      }

      return sugestoes.slice(0, 5); // Retornar no máximo 5 sugestões

    } catch (error) {
      console.error('Erro ao sugerir horários alternativos:', error);
      return [];
    }
  }

  // Converter minutos para horário HH:MM
  private minutosParaHorario(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

export const conflictDetector = new ConflictDetector();