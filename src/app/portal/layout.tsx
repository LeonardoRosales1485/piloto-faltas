import { PortalLayout } from '@/components/PortalLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PortalLayout>{children}</PortalLayout>;
}
