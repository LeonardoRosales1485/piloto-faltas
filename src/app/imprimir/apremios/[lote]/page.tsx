'use client';
import { useParams } from 'next/navigation';
import { ImpresionApremios } from '@/components/ImpresionApremios';

export default function Page() {
  const { lote } = useParams() as { lote: string };
  return <ImpresionApremios lote={decodeURIComponent(lote)} />;
}
