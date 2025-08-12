'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ContratoVisualizacao } from '@/components/contratos/contrato-visualizacao';

export default function ContratoDetalhePage() {
  const params = useParams();
  const contratoId = params.id as string;

  return (
      <ContratoVisualizacao contratoId={contratoId} />
  );
}