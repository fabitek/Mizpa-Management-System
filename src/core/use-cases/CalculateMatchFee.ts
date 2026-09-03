/**
 * Calculates the prorated match fee per player rounded up to avoid fractional deficits.
 * 
 * @param totalCost Total cost of the match (pitch rental + extra costs)
 * @param playerCount Number of confirmed/attended players
 * @returns Prorated fee rounded up using Math.ceil, or 0 if playerCount <= 0
 */
export function calculateMatchFee(totalCost: number, playerCount: number): number {
  if (playerCount <= 0 || totalCost <= 0) {
    return 0;
  }
  return Math.ceil(totalCost / playerCount);
}

export class CalculateMatchFeeUseCase {
  execute(totalCost: number, playerCount: number): number {
    return calculateMatchFee(totalCost, playerCount);
  }
}
