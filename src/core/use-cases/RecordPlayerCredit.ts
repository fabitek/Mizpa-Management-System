import type { FinancialEntry, IFinanceRepository } from '../domain/index.ts';
import { InvalidFinancialAmountError } from '../domain/index.ts';

export interface RecordPlayerCreditInput {
  playerId: string;
  amount: number;
  note?: string;
  receiptUrl?: string;
  referenceDate?: Date;
}

export interface RecordPlayerCreditResult {
  entry: FinancialEntry;
  newBalance: number;
}

export class RecordPlayerCreditUseCase {
  private readonly financeRepository: IFinanceRepository;
  private readonly idGenerator?: () => string;

  constructor(
    financeRepository: IFinanceRepository,
    idGenerator?: () => string
  ) {
    this.financeRepository = financeRepository;
    this.idGenerator = idGenerator;
  }

  async execute(input: RecordPlayerCreditInput): Promise<RecordPlayerCreditResult> {
    const { playerId, amount, note, receiptUrl, referenceDate = new Date() } = input;

    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
      throw new InvalidFinancialAmountError(
        'Credit amount must be a finite number greater than zero.'
      );
    }

    const entryId = this.idGenerator
      ? this.idGenerator()
      : `credit-${playerId}-${Date.now()}`;

    const entry: FinancialEntry = {
      id: entryId,
      playerId,
      matchId: null,
      type: 'CREDIT',
      amount,
      referenceDate,
      receiptUrl,
      note: note || 'Abono / Recarga a favor',
      createdAt: new Date(),
    };

    await this.financeRepository.recordEntry(entry);
    const newBalance = await this.financeRepository.getPlayerBalance(playerId);

    return {
      entry,
      newBalance,
    };
  }
}
