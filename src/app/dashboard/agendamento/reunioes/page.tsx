'use client';

import { useState } from 'react';
import { Metadata } from 'next';
import { ReunioesList } from '@/components/reunioes/reunioes-list';
import { ReuniaoForm } from '@/components/reunioes/reuniao-form';
import { ReuniaoDetails } from '@/components/reunioes/reuniao-details';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { usePermissions } from '@/hooks/usePermissions';

export default function ReuniaoesPage() {
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedReuniao, setSelectedReuniao] = useState<any>(null);
  const [editingReuniao, setEditingReuniao] = useState<any>(null);
  
  const { permissions, user, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  function handleNew() {
    setEditingReuniao(null);
    setShowForm(true);
  }

  function handleEdit(reuniao: any) {
    setEditingReuniao(reuniao);
    setShowForm(true);
  }

  function handleView(reuniao: any) {
    setSelectedReuniao(reuniao);
    setShowDetails(true);
  }

  function handleSuccess() {
    setShowForm(false);
    setEditingReuniao(null);
    // A lista será atualizada automaticamente
  }

  function handleCancel() {
    setShowForm(false);
    setEditingReuniao(null);
  }

  return (
    <div className="space-y-6">
      {/* Lista de Reuniões */}
      <ReunioesList 
        onNew={permissions.canCreateMeetings ? handleNew : undefined}
        onEdit={handleEdit}
        onView={handleView}
        vendedorId={permissions.vendedorId} // Filtra por vendedor se não for admin
        showActions={permissions.canEditMeetings || permissions.canDeleteMeetings}
      />

      {/* Formulário de Nova/Editar Reunião */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ReuniaoForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            reuniaoId={editingReuniao?.id}
            initialData={editingReuniao}
          />
        </DialogContent>
      </Dialog>

      {/* Detalhes da Reunião */}
      {selectedReuniao && (
        <ReuniaoDetails
          reuniaoId={selectedReuniao.id}
          open={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedReuniao(null);
          }}
          onEdit={permissions.canEditMeetings ? handleEdit : undefined}
          onReagendar={permissions.canEditMeetings ? (reuniao) => {
            // Implementar modal de reagendamento
            console.log('Reagendar reunião:', reuniao);
          } : undefined}
        />
      )}
    </div>
  );
}