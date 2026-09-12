import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mizpa Match Management & Settlement',
  description: 'Sistema de Gestión de Partidos de Fútbol y Liquidación Financiera',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
