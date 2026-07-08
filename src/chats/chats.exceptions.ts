import { BadRequestException } from '@nestjs/common';

export class InvalidChatCursorException extends BadRequestException {
  constructor() {
    super({
      code: 'invalid_cursor',
      message: 'Invalid cursor',
    });
  }
}

export class InvalidChatMessageException extends BadRequestException {
  constructor() {
    super({
      code: 'validation_error',
      message: 'Request validation failed',
    });
  }
}
