import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { AffiliationRepository } from '../affiliations/affiliations.repository';
import {
  CreateUserRequestDto,
  CreateUserResponseDto,
} from './dto/create-user.dto';
import {
  NicknameAvailabilityResponseDto,
} from './dto/nickname-availability.dto';
import { User } from './user.entity';
import {
  InvalidAffiliationException,
  NicknameAlreadyExistsException,
} from './users.exceptions';
import { UsersRepository } from './users.repository';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly affiliationRepository: AffiliationRepository,
  ) {}

  async create(dto: CreateUserRequestDto): Promise<CreateUserResponseDto> {
    if (await this.userRepository.existsByNickname(dto.nickname)) {
      throw new NicknameAlreadyExistsException();
    }

    const affiliation = await this.affiliationRepository.findByCode(
      dto.affiliationCode,
    );

    if (!affiliation) {
      throw new InvalidAffiliationException();
    }

    const user = new User(
      dto.nickname,
      await hashPassword(dto.password),
      affiliation,
    );

    try {
      const createdUser = await this.userRepository.create(user);

      return { id: createdUser.id };
    } catch (error) {
      // The DB unique index closes the existsByNickname/insert race.
      if (isDuplicateKeyError(error)) {
        throw new NicknameAlreadyExistsException();
      }

      throw error;
    }
  }

  async checkNicknameAvailability(
    nickname: string,
  ): Promise<NicknameAvailabilityResponseDto> {
    const exists = await this.userRepository.existsByNickname(nickname);

    return { available: !exists };
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);

  return `scrypt:${salt}:${key.toString('hex')}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return (
    error.code === 'ER_DUP_ENTRY' ||
    error.errno === 1062 ||
    isDuplicateKeyError(error.cause) ||
    isDuplicateKeyError(error.driverError)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
