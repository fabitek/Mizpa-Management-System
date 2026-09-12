import type {
  Match,
  FinancialEntry,
  IMatchRepository,
  IAttendanceRepository,
  IFinanceRepository,
} from '../domain/index.ts';
import {
  MatchAlreadySettledError,
  InvalidAttendanceStateError,
} from '../domain/index.ts';
import { calculateMatchFee } from './CalculateMatchFee.ts';

export interface SettleMatchInput {
  matchId: string;
  referenceDate?: Date;
}

export interface SettleMatchResult {
  match: Match;
  settledFeePerPlayer: number;
  entries: FinancialEntry[];
}

export class SettleMatchUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly attendanceRepository: IAttendanceRepository;
  private readonly financeRepository: IFinanceRepository;
  private readonly idGenerator?: () => string;

  constructor(
    matchRepository: IMatchRepository,
    attendanceRepository: IAttendanceRepository,
    financeRepository: IFinanceRepository,
    idGenerator?: () => string
  ) {
    this.matchRepository = matchRepository;
    this.attendanceRepository = attendanceRepository;
    this.financeRepository = financeRepository;
    this.idGenerator = idGenerator;
  }

  async execute(input: SettleMatchInput): Promise<SettleMatchResult> {
    const { matchId, referenceDate = new Date() } = input;

    // 1. Carga el partido por ID. Si no existe, lanza error.
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error(`Match with ID '${matchId}' not found.`);
    }

    // 2. Si el partido ya está en status 'SETTLED', lanza MatchAlreadySettledError.
    if (match.status === 'SETTLED') {
      throw new MatchAlreadySettledError(
        `Match '${matchId}' is already settled.`
      );
    }

    // 3. Carga las asistencias del partido y filtra por status 'ATTENDED'.
    const attendances = await this.attendanceRepository.findByMatchId(matchId);
    const attendees = attendances.filter(
      (attendance) => attendance.status === 'ATTENDED'
    );

    // 4. Si no hay asistentes válidos, lanza InvalidAttendanceStateError.
    if (attendees.length === 0) {
      throw new InvalidAttendanceStateError(
        `Cannot settle match '${matchId}': No attendees with 'ATTENDED' status found.`
      );
    }

    // 5. Calcula la cuota final por asistente con Math.ceil((pitchRentalCost + extraCosts) / asistentes.length).
    const totalCost = match.pitchRentalCost + match.extraCosts;
    const feePerPlayer = calculateMatchFee(totalCost, attendees.length);

    // 6. Genera un FinancialEntry tipo 'DEBIT' para cada jugador asistente por el valor liquidado.
    const entries: FinancialEntry[] = attendees.map((attendee, index) => {
      const entryId = this.idGenerator
        ? this.idGenerator()
        : `entry-${match.id}-${attendee.playerId}-${Date.now()}-${index}`;

      const targetPlayerId = attendee.registeredByPlayerId ?? attendee.playerId;
      const note = attendee.guestName
        ? `Liquidación de partido ${match.id} (Invitado +1: ${attendee.guestName})`
        : `Liquidación de partido ${match.id} (${match.location})`;

      return {
        id: entryId,
        playerId: targetPlayerId,
        matchId: match.id,
        type: 'DEBIT',
        amount: feePerPlayer,
        referenceDate,
        note,
        createdAt: new Date(),
      };
    });

    // 7. Persiste los débitos vía recordBatchEntries.
    await this.financeRepository.recordBatchEntries(entries);

    // 8. Actualiza el partido: status = 'SETTLED', settledFeePerPlayer = cuota, updatedAt = new Date().
    const updatedMatch: Match = {
      ...match,
      status: 'SETTLED',
      settledFeePerPlayer: feePerPlayer,
      updatedAt: new Date(),
    };

    // 9. Guarda el partido actualizado mediante update.
    await this.matchRepository.update(updatedMatch);

    // 10. Retorna el partido liquidado y el monto asignado.
    return {
      match: updatedMatch,
      settledFeePerPlayer: feePerPlayer,
      entries,
    };
  }
}
