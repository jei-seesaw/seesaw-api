import { NotFoundException } from '@nestjs/common';

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super({
      code: 'user_not_found',
      message: 'User not found',
    });
  }
}
