import { Injectable } from '@nestjs/common';
import { AffiliationRepository } from '../affiliations/affiliations.repository';
import {
  CreateUserRequestDto,
  CreateUserResponseDto,
} from './dto/create-user.dto';
import {
  NicknameAvailabilityResponseDto,
  NicknameSuggestionResponseDto,
} from './dto/nickname-availability.dto';
import { User } from './user.entity';
import {
  InvalidAffiliationException,
  NicknameAlreadyExistsException,
  NicknameSuggestionUnavailableException,
} from './users.exceptions';
import { hashPassword } from './password';
import { UsersRepository } from './users.repository';

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

  async suggestNickname(): Promise<NicknameSuggestionResponseDto> {
    const total = NICKNAME_PREFIXES.length * NICKNAME_SUFFIXES.length;
    const startIndex = Math.floor(Math.random() * total);

    for (let offset = 0; offset < total; offset += 1) {
      const nickname = buildNicknameSuggestion((startIndex + offset) % total);

      if (!(await this.userRepository.existsByNickname(nickname))) {
        return { nickname };
      }
    }

    throw new NicknameSuggestionUnavailableException();
  }
}

const NICKNAME_PREFIXES = [
  '행복한',
  '슬픈',
  '활발한',
  '차분한',
  '용감한',
  '다정한',
  '똑똑한',
  '따뜻한',
  '반짝이는',
  '씩씩한',
  '신나는',
  '고요한',
  '상냥한',
  '재빠른',
  '느긋한',
  '귀여운',
  '든든한',
  '솔직한',
  '명랑한',
  '부지런한',
  '자유로운',
  '빛나는',
  '진지한',
  '유쾌한',
  '우아한',
  '당당한',
  '포근한',
  '선명한',
  '즐거운',
  '순수한',
  '친절한',
  '호기심 많은',
  '재치있는',
  '근사한',
  '멋진',
  '평온한',
  '새로운',
  '특별한',
  '희망찬',
  '산뜻한',
] as const;

const NICKNAME_SUFFIXES = [
  '라이온',
  '메타몽',
  '고래',
  '펭귄',
  '여우',
  '판다',
  '수달',
  '코알라',
  '알파카',
  '돌고래',
  '부엉이',
  '고양이',
  '강아지',
  '토끼',
  '다람쥐',
  '치타',
  '기린',
  '코끼리',
  '햄스터',
  '사슴',
  '늑대',
  '캥거루',
  '탐험가',
  '항해사',
  '발명가',
  '정원사',
  '여행자',
  '작가',
  '화가',
  '음악가',
  '수호자',
  '별지기',
  '구름지기',
  '바다지기',
  '숲지기',
  '달지기',
  '햇살',
  '파도',
  '산책가',
  '이야기꾼',
] as const;

function buildNicknameSuggestion(index: number): string {
  return `${NICKNAME_PREFIXES[Math.floor(index / NICKNAME_SUFFIXES.length)]} ${
    NICKNAME_SUFFIXES[index % NICKNAME_SUFFIXES.length]
  }`;
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
