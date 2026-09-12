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

export class MatchNotFoundError extends Error {
  constructor(message: string = 'Match not found.') {
    super(message);
    this.name = 'MatchNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MatchRegistrationClosedError extends Error {
  constructor(message: string = 'Match registration is closed.') {
    super(message);
    this.name = 'MatchRegistrationClosedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PlayerAlreadyRegisteredError extends Error {
  constructor(message: string = 'Player is already registered for this match.') {
    super(message);
    this.name = 'PlayerAlreadyRegisteredError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidGoalDataError extends Error {
  constructor(message: string = 'Invalid goal data.') {
    super(message);
    this.name = 'InvalidGoalDataError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GoalNotFoundError extends Error {
  constructor(message: string = 'Goal event not found.') {
    super(message);
    this.name = 'GoalNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
