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
  '용감한',
  '신중한',
  '과묵한',
  '냉철한',
  '뜨거운',
  '든든한',
  '여유로운',
  '성실한',
  '유쾌한',
  '무심한',
  '근엄한',
  '발랄한',
  '차분한',
  '대담한',
  '소심한',
  '예리한',
  '느긋한',
  '날쌘',
  '우직한',
  '엉뚱한',
  '집요한',
  '산뜻한',
  '화끈한',
  '은밀한',
  '명랑한',
  '진지한',
  '자유로운',
  '침착한',
  '조용한',
  '활발한',
  '배고픈',
  '졸린',
  '피곤한',
  '상쾌한',
  '배부른',
  '커피가필요한',
  '야근하는',
  '칼퇴하는',
  '월요일이싫은',
  '불타는',
  '반짝이는',
  '겸손한',
  '재빠른',
  '노련한',
  '순수한',
  '열정적인',
  '도전적인',
  '신비로운',
  '당당한',
  '느닷없는',
] as const;

const NICKNAME_SUFFIXES = [
  '호랑이',
  '여우',
  '사자',
  '독수리',
  '곰',
  '늑대',
  '고양이',
  '강아지',
  '판다',
  '펭귄',
  '김밥',
  '떡볶이',
  '만두',
  '라면',
  '붕어빵',
  '치킨',
  '피자',
  '초코파이',
  '아이스크림',
  '감자칩',
  '우산',
  '나침반',
  '망원경',
  '열쇠',
  '등대',
  '지도',
  '시계',
  '저금통',
  '로켓',
  '돋보기',
  '승부사',
  '예측러',
  '배당왕',
  '분석가',
  '도전자',
  '전략가',
  '심판',
  '투자자',
  '해결사',
  '관찰자',
  '팀장',
  '신입사원',
  '인턴',
  '부장님',
  '막내',
  '야근러',
  '회의왕',
  '커피러버',
  '점심메이트',
  '칼퇴요정',
  '마법사',
  '탐정',
  '요정',
  '용',
  '유니콘',
  '히어로',
  '닌자',
  '해적',
  '사무라이',
  '기사',
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
