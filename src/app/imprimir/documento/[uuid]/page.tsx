'use client';
import { useParams } from 'next/navigation';
import { Impresion } from '@/components/Impresion';

export default function Page() {
  const { uuid } = useParams() as { uuid: string };
  return <Impresion modo="documento" uuid={uuid} />;
}
