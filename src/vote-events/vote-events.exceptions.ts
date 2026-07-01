import { BadRequestException } from '@nestjs/common';

export class InvalidCursorException extends BadRequestException {
  constructor() {
    super({
      code: 'invalid_cursor',
      message: 'Invalid cursor',
    });
  }
}
