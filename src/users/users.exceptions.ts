import { ConflictException, UnprocessableEntityException } from '@nestjs/common';

export class NicknameAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      code: 'nickname_already_exists',
      message: 'Nickname already exists',
    });
  }
}

export class NicknameSuggestionUnavailableException extends ConflictException {
  constructor() {
    super({
      code: 'nickname_suggestion_unavailable',
      message: 'Nickname suggestion unavailable',
    });
  }
}

export class InvalidAffiliationException extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'invalid_affiliation',
      message: 'Invalid affiliation code',
    });
  }
}
