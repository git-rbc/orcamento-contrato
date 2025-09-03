import { Metadata } from 'next';
import { AgendaIntegrada } from '@/components/reunioes/agenda-integrada';

export const metadata: Metadata = {
  title: 'Agenda Integrada | Gestão de Contratos',
  description: 'Visualização unificada da agenda com reuniões, reservas temporárias e fila de espera',
};

export default function AgendaIntegradaPage() {
  return (
    <div className="container mx-auto p-6">
      <AgendaIntegrada />
    </div>
  );
}