import { getAllPlayersAction } from '../actions/player-actions.ts';
import { PublicPlayerPaymentView } from '../../components/wallet/PublicPlayerPaymentView.tsx';
import {
  matchRepository,
  attendanceRepository,
  calculateMatchFeeUseCase,
} from '../../infrastructure/container.ts';

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

  let defaultMatchFee = 8500;
  let activeMatchId: string | undefined = undefined;

  try {
    const allMatches = await matchRepository.findAll();
    const sortedMatches = [...allMatches].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const activeMatch = sortedMatches.find((m) => m.status === 'OPEN_REGISTRATION' || m.status === 'DRAFT') || sortedMatches[0];

    if (activeMatch) {
      activeMatchId = activeMatch.id;
      if (activeMatch.settledFeePerPlayer) {
        defaultMatchFee = activeMatch.settledFeePerPlayer;
      } else {
        const attendances = await attendanceRepository.findByMatchId(activeMatch.id);
        const confirmedAttendees = attendances.filter(
          (a) => a.status === 'CONFIRMED' || a.status === 'ATTENDED'
        );
        const totalCost = (activeMatch.pitchRentalCost || 0) + (activeMatch.extraCosts || 0);
        const count = confirmedAttendees.length > 0 ? confirmedAttendees.length : activeMatch.maxPlayers || 18;
        const fee = calculateMatchFeeUseCase.execute(totalCost, count);
        if (fee > 0) {
          defaultMatchFee = fee;
        }
      }
    }
  } catch (err) {
    console.warn('PagoPage defaultMatchFee calculation fallback:', err);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-white pb-16">
      <PublicPlayerPaymentView
        players={players}
        defaultPlayerId={defaultPlayerId}
        defaultMatchFee={defaultMatchFee}
        activeMatchId={activeMatchId}
      />
    </div>
  );
}
