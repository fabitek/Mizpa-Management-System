export class MatchAlreadySettledError extends Error {
  constructor(message: string = 'Match is already settled.') {
    super(message);
    this.name = 'MatchAlreadySettledError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MaxCapacityReachedError extends Error {
  constructor(message: string = 'Maximum match capacity reached.') {
    super(message);
    this.name = 'MaxCapacityReachedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidAttendanceStateError extends Error {
  constructor(message: string = 'Invalid attendance state transition.') {
    super(message);
    this.name = 'InvalidAttendanceStateError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidFinancialAmountError extends Error {
  constructor(message: string = 'Invalid financial amount.') {
    super(message);
    this.name = 'InvalidFinancialAmountError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
