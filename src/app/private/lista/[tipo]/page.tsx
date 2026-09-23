import { redirect } from 'next/navigation';

type Props = { params: Promise<{ tipo: string }> };

export default async function Page({ params }: Props) {
  const { tipo } = await params;
  redirect(`/private/lista-infracciones/${tipo}`);
}
