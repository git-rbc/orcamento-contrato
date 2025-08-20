import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agendamento | Gestão de Contratos',
  description: 'Sistema de agendamento de reuniões',
};

export default function AgendamentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {children}
    </div>
  );
}