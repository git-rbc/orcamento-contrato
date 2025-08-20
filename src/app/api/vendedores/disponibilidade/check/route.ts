import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    
    const { vendedor_id, data, hora_inicio, hora_fim, excludeReuniaoId } = body;

    if (!vendedor_id || !data || !hora_inicio || !hora_fim) {
      return NextResponse.json(
        { error: 'Vendedor, data e horários são obrigatórios' },
        { status: 400 }
      );
    }

    // Converter data para dia da semana (0 = domingo)
    const dataObj = new Date(data + 'T00:00:00');
    const diaSemana = dataObj.getDay();

    // 1. Verificar se o vendedor tem disponibilidade cadastrada para este dia/horário
    const { data: disponibilidades } = await supabase
      .from('disponibilidade_vendedores')
      .select('*')
      .eq('vendedor_id', vendedor_id)
      .eq('dia_semana', diaSemana)
      .eq('ativo', true)
      .lte('hora_inicio', hora_inicio)
      .gte('hora_fim', hora_fim);

    const temDisponibilidade = disponibilidades && disponibilidades.length > 0;

    // 2. Verificar se há conflitos com outras reuniões
    let reunioesQuery = supabase
      .from('reunioes')
      .select('id, titulo, hora_inicio, hora_fim')
      .eq('vendedor_id', vendedor_id)
      .eq('data', data)
      .neq('status', 'cancelada')
      .or(`and(hora_inicio.lt.${hora_fim},hora_fim.gt.${hora_inicio})`);

    if (excludeReuniaoId) {
      reunioesQuery = reunioesQuery.neq('id', excludeReuniaoId);
    }

    const { data: conflitoReunioes } = await reunioesQuery;

    // 3. Verificar se há bloqueios ativos
    const { data: bloqueios } = await supabase
      .from('bloqueios_vendedores')
      .select('*')
      .eq('vendedor_id', vendedor_id)
      .eq('ativo', true)
      .lte('data_inicio', data)
      .gte('data_fim', data)
      .or(`hora_inicio.is.null,and(hora_inicio.lte.${hora_fim},hora_fim.gte.${hora_inicio})`);

    const temBloqueios = bloqueios && bloqueios.length > 0;
    const temConflitos = conflitoReunioes && conflitoReunioes.length > 0;

    // Calcular horários disponíveis para o dia (se aplicável)
    let horariosDisponiveis: any[] = [];
    if (temDisponibilidade && !temBloqueios) {
      // Para cada slot de disponibilidade, verificar quais horários estão livres
      for (const disp of disponibilidades || []) {
        const slots = gerarHorariosLivres(
          disp.hora_inicio,
          disp.hora_fim,
          conflitoReunioes || [],
          60 // Duração padrão de 60 minutos
        );
        horariosDisponiveis.push(...slots);
      }
    }

    const disponivel = temDisponibilidade && !temConflitos && !temBloqueios;

    return NextResponse.json({
      data: {
        disponivel,
        tem_disponibilidade_cadastrada: temDisponibilidade,
        tem_conflitos: temConflitos,
        tem_bloqueios: temBloqueios,
        conflitos: {
          reunioes: conflitoReunioes || [],
          bloqueios: bloqueios || []
        },
        disponibilidades_cadastradas: disponibilidades || [],
        horarios_disponiveis: horariosDisponiveis.slice(0, 20) // Limitar a 20 slots
      }
    });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Helper para gerar horários disponíveis
function gerarHorariosLivres(
  horaInicio: string,
  horaFim: string,
  reunioesConflitantes: any[],
  duracaoMinutos: number = 60
) {
  const slots: any[] = [];
  const inicio = timeStringToMinutes(horaInicio);
  const fim = timeStringToMinutes(horaFim);
  
  for (let minutos = inicio; minutos + duracaoMinutos <= fim; minutos += 30) { // Slots de 30 em 30 min
    const slotInicio = minutesToTimeString(minutos);
    const slotFim = minutesToTimeString(minutos + duracaoMinutos);
    
    // Verificar se o slot conflita com alguma reunião
    const temConflito = reunioesConflitantes.some(reuniao => {
      const reuniaoInicio = timeStringToMinutes(reuniao.hora_inicio);
      const reuniaoFim = timeStringToMinutes(reuniao.hora_fim);
      
      return !(minutos + duracaoMinutos <= reuniaoInicio || minutos >= reuniaoFim);
    });
    
    if (!temConflito) {
      slots.push({
        hora_inicio: slotInicio,
        hora_fim: slotFim,
        duracao_minutos: duracaoMinutos
      });
    }
  }
  
  return slots;
}

// Converter string de tempo para minutos desde meia-noite
function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

// Converter minutos desde meia-noite para string de tempo
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}