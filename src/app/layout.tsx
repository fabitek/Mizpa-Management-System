import type { Metadata } from 'next';
import './globals.css';
import { AppHeader } from '../components/navigation/AppHeader.tsx';
import { authService } from '../infrastructure/container.ts';

export const metadata: Metadata = {
  title: 'Mizpa Match Management & Settlement',
  description: 'Sistema de Gestión de Partidos de Fútbol y Liquidación Financiera',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;

  try {
    session = await authService.getCurrentSession();
  } catch (err) {
    console.warn('RootLayout session warning:', err);
  }

  const currentRole    = session?.user.role     ?? 'ADMIN';
  const currentName    = session?.user.fullName  ?? 'Fabián Téllez';

  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
        <AppHeader
          initialRole={currentRole}
          initialFullName={currentName}
        />
        {children}
      </body>
    </html>
  );
}

