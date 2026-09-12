import {
  getAllPlayersFinancialOverviewUseCase,
  getPlayerStatementUseCase,
} from '../../infrastructure/container.ts';
import { initialPlayers } from '../../infrastructure/seed-data.ts';
import { PlayerWalletView } from '../../components/wallet/PlayerWalletView.tsx';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const playerIds = initialPlayers.map((p) => p.id);
  const overview = await getAllPlayersFinancialOverviewUseCase.execute(playerIds);
  const firstPlayerId = initialPlayers[0]?.id ?? '';
  const initialStatement = await getPlayerStatementUseCase.execute(firstPlayerId);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <PlayerWalletView
        players={initialPlayers}
        initialOverview={overview}
        initialSelectedPlayerId={firstPlayerId}
        initialStatement={initialStatement}
      />
    </main>
  );
}
