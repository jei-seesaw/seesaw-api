import { BadRequestException, NotFoundException } from '@nestjs/common';

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
