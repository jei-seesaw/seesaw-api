import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

export class InvalidCursorException extends BadRequestException {
  constructor() {
    super({
      code: 'invalid_cursor',
      message: 'Invalid cursor',
    });
  }
}

export class VoteEventNotFoundException extends NotFoundException {
  constructor() {
    super({
      code: 'vote_event_not_found',
      message: 'Vote event not found',
    });
  }
}

export class VoteEventClosedException extends ConflictException {
  constructor() {
    super({
      code: 'vote_event_closed',
      message: 'Vote event is closed',
    });
  }
}

export class VoteEventAlreadyParticipatedException extends ConflictException {
  constructor() {
    super({
      code: 'vote_event_already_participated',
      message: 'Already participated in this vote event',
    });
  }
}

export class VoteEventResultForbiddenException extends ForbiddenException {
  constructor() {
    super({
      code: 'vote_event_result_forbidden',
      message: 'Only the vote event organizer can confirm the result',
    });
  }
}

export class VoteEventResultAlreadyConfirmedException extends ConflictException {
  constructor() {
    super({
      code: 'vote_event_result_already_confirmed',
      message: 'Vote event result is already confirmed',
    });
  }
}

export class VoteEventResultNotAllowedException extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'vote_event_result_not_allowed',
      message: 'Only betting vote events can confirm a result',
    });
  }
}

export class BettingRewardForbiddenException extends ForbiddenException {
  constructor() {
    super({
      code: 'betting_reward_forbidden',
      message: 'Only participants can claim betting rewards',
    });
  }
}

export class BettingResultNotConfirmedException extends ConflictException {
  constructor() {
    super({
      code: 'betting_result_not_confirmed',
      message: 'Betting result is not confirmed',
    });
  }
}

export class BettingRewardNotAllowedException extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'betting_reward_not_allowed',
      message: 'Only betting vote events can claim rewards',
    });
  }
}

export class InvalidVoteEventDeadlineException extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'invalid_vote_event_deadline',
      message: 'Vote event deadline must be hourly and within 24 hours',
    });
  }
}

export class InsufficientVoteTokenException extends ConflictException {
  constructor() {
    super({
      code: 'insufficient_vote_token',
      message: 'Insufficient vote token',
    });
  }
}

export class TokenAmountRequiredException extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'token_amount_required',
      message: 'Token amount is required for betting vote events',
    });
  }
}

export class TokenAmountNotAllowedException extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'token_amount_not_allowed',
      message: 'Token amount is only allowed for betting vote events',
    });
  }
}
