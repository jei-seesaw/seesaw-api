import {
  BadRequestException,
  ConflictException,
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
