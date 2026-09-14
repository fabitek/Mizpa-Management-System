import { getAllPlayersAction } from '../actions/player-actions.ts';
import { PublicPlayerPaymentView } from '../../components/wallet/PublicPlayerPaymentView.tsx';

export const metadata = {
  title: 'Portal de Pagos & Comprobantes • Mizpa FC',
  description: 'Sube tu comprobante de Nequi, Daviplata o Bancolombia para abonar a tu cuenta de jugador.',
};

export const dynamic = 'force-dynamic';

export default async function PagoPage({
  searchParams,
}: {
  searchParams?: Promise<{ player?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const defaultPlayerId = resolvedParams.player || '';
  const players = await getAllPlayersAction();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-white pb-16">
      <PublicPlayerPaymentView players={players} defaultPlayerId={defaultPlayerId} />
    </div>
  );
}
