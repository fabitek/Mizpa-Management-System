import type { Metadata } from 'next';
import './globals.css';
import { AppHeader } from '../components/navigation/AppHeader.tsx';
import { initialPlayers } from '../infrastructure/seed-data.ts';
import { authService, playerRepository } from '../infrastructure/container.ts';

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
  let players = initialPlayers;

  try {
    session = await authService.getCurrentSession();
    const dbPlayers = await playerRepository.findAll();
    if (dbPlayers && dbPlayers.length > 0) {
      players = dbPlayers;
    }
  } catch (err) {
    console.warn('RootLayout session/players warning:', err);
  }

  const currentRole = session?.user.role ?? 'ADMIN';
  const currentId = session?.user.playerId ?? players[0]?.id ?? 'f0000000-0000-4000-8000-000000000001';
  const currentName = session?.user.fullName ?? players[0]?.fullName ?? 'Fabián Téllez';

  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
        <AppHeader
          players={players}
          initialPlayerId={currentId}
          initialRole={currentRole}
          initialFullName={currentName}
        />
        {children}
      </body>
    </html>
  );
}
