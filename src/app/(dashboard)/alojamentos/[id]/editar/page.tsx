'use client'

import { useParams } from 'next/navigation'
import AlojamentoForm from '../../AlojamentoForm'

export default function EditarAlojamentoPage() {
  const { id } = useParams<{ id: string }>()
  return <AlojamentoForm alojamentoId={id} />
}
