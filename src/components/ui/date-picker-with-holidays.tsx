'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Holiday {
  date: string; // "YYYY-MM-DD"
  name: string;
  type: string;
}

interface DatePickerWithHolidaysProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
}

export function DatePickerWithHolidays({ date, setDate, className }: DatePickerWithHolidaysProps) {
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [selectedHolidayName, setSelectedHolidayName] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchHolidays = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/feriados');
        if (!response.ok) {
          throw new Error('Failed to fetch holidays');
        }
        const data: Holiday[] = await response.json();
        setHolidays(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, []);

  const holidayDates = React.useMemo(() => 
    holidays.map(h => new Date(h.date + 'T12:00:00')), 
  [holidays]);

  const holidayEveDates = React.useMemo(() => {
    return holidays.map(h => {
      const holidayDate = new Date(h.date + 'T12:00:00');
      const eveDate = new Date(holidayDate);
      eveDate.setDate(eveDate.getDate() - 1);
      return eveDate;
    });
  }, [holidays]);

  const getHolidayName = React.useCallback((day: Date): string | null => {
    const holiday = holidays.find(h => {
        const holidayDate = new Date(h.date + 'T12:00:00');
        return holidayDate.toDateString() === day.toDateString();
    });
    return holiday ? holiday.name : null;
  }, [holidays]);

  const modifiers = {
    holiday: holidayDates,
    holidayEve: holidayEveDates,
  };

  const modifiersClassNames = {
    holiday: 'holiday-date',
    holidayEve: 'holiday-eve-date',
  };
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      const name = getHolidayName(selectedDate);
      setSelectedHolidayName(name);
    } else {
      setSelectedHolidayName(null);
    }
    setPopoverOpen(false); // Fecha o popover ao selecionar
  }

  // O tooltip ao passar o mouse foi removido temporariamente para corrigir o highlight
  // que é a funcionalidade principal.

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, 'PPP', { locale: ptBR })
            ) : (
              <span>Selecione uma data</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
              locale={ptBR}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              disabled={loading}
              captionLayout="dropdown"
              fromYear={2020}
              toYear={2035}
            />
        </PopoverContent>
      </Popover>
      {selectedHolidayName && (
        <p className="text-sm text-muted-foreground mt-2">
          Feriado: {selectedHolidayName}
        </p>
      )}
    </>
  );
} 