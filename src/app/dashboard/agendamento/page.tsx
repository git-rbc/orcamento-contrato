import { Metadata } from 'next';
import { ReunioesList } from '@/components/reunioes/reunioes-list';
import { DashboardAdministrativo } from '@/components/reunioes/dashboard-administrativo';

export const metadata: Metadata = {
  title: 'Sistema de Agendamento | Gestão de Contratos',
  description: 'Sistema completo de agendamento de reuniões com vendedores',
};

export default function AgendamentoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sistema de Agendamento</h1>
        <p className="text-muted-foreground">
          Gerencie reuniões, disponibilidade de vendedores e acompanhe métricas de conversão.
        </p>
      </div>
      
      {/* Dashboard com métricas principais */}
      <DashboardAdministrativo />
    </div>
  );
}