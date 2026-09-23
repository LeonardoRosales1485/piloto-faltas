import { PrivateGate } from '@/components/PrivateGate';

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <PrivateGate>{children}</PrivateGate>;
}
