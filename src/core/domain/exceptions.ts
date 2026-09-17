export class MatchAlreadySettledError extends Error {
  constructor(message: string = 'Partido ya liquidado.') {
    super(message);
    this.name = 'MatchAlreadySettledError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MaxCapacityReachedError extends Error {
  constructor(message: string = 'Cupos agotados en cancha.') {
    super(message);
    this.name = 'MaxCapacityReachedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidAttendanceStateError extends Error {
  constructor(message: string = 'Cambio de estado no permitido.') {
    super(message);
    this.name = 'InvalidAttendanceStateError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidFinancialAmountError extends Error {
  constructor(message: string = 'Monto inválido.') {
    super(message);
    this.name = 'InvalidFinancialAmountError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MatchNotFoundError extends Error {
  constructor(message: string = 'Partido no existe.') {
    super(message);
    this.name = 'MatchNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MatchRegistrationClosedError extends Error {
  constructor(message: string = 'Inscripciones cerradas.') {
    super(message);
    this.name = 'MatchRegistrationClosedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PlayerAlreadyRegisteredError extends Error {
  constructor(message: string = 'Jugador ya inscrito en este partido.') {
    super(message);
    this.name = 'PlayerAlreadyRegisteredError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidGoalDataError extends Error {
  constructor(message: string = 'Registro de gol inválido.') {
    super(message);
    this.name = 'InvalidGoalDataError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GoalNotFoundError extends Error {
  constructor(message: string = 'Gol no encontrado.') {
    super(message);
    this.name = 'GoalNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Sin permisos para esta acción.') {
    super(message);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotificationDeliveryError extends Error {
  constructor(message: string = 'Error al enviar notificación.') {
    super(message);
    this.name = 'NotificationDeliveryError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
