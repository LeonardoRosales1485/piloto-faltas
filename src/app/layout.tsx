import type { Metadata } from 'next';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '../styles.scss';
import { AccesibilidadTeclado } from '@/components/AccesibilidadTeclado';
import { AuthBootstrap } from '@/components/AuthBootstrap';
import { NotifyProvider } from '@/components/NotifyProvider';
import { SCRIPT_CONTRASTE } from '@/lib/contraste-script';

export const metadata: Metadata = {
  title: 'Sistema de Faltas · Piloto',
  description: 'Sistema de Faltas · Piloto',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-contrast lo pone el script antes de hidratar (alto contraste, A11Y paso 4).
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_CONTRASTE }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NotifyProvider>
          <AuthBootstrap />
          <AccesibilidadTeclado />
          {children}
        </NotifyProvider>
      </body>
    </html>
  );
}
