import type { Metadata } from 'next';
import './globals.css';
import { AppHeader } from '../components/navigation/AppHeader.tsx';
import { initialPlayers } from '../infrastructure/seed-data.ts';
import { authService } from '../infrastructure/container.ts';

export const metadata: Metadata = {
  title: 'Mizpa Match Management & Settlement',
  description: 'Sistema de Gestión de Partidos de Fútbol y Liquidación Financiera',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await authService.getCurrentSession();
  const currentRole = session?.user.role ?? 'ADMIN';
  const currentId = session?.user.playerId ?? initialPlayers[0].id;
  const currentName = session?.user.fullName ?? initialPlayers[0].fullName;

  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
        <AppHeader
          players={initialPlayers}
          initialPlayerId={currentId}
          initialRole={currentRole}
          initialFullName={currentName}
        />
        {children}
      </body>
    </html>
  );
}
