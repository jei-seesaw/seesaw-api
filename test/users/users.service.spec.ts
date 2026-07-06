import { UsersRepository } from '../../src/users/users.repository';
import { UsersService } from '../../src/users/users.service';
import type { Affiliation } from '../../src/affiliations/affiliation.entity';
import { AffiliationRepository } from '../../src/affiliations/affiliations.repository';
import type { User } from '../../src/users/user.entity';
import {
  InvalidAffiliationException,
  NicknameAlreadyExistsException,
  NicknameSuggestionUnavailableException,
} from '../../src/users/users.exceptions';

describe('UsersService', () => {
  const originalRandom = Math.random;
  let affiliations: FakeAffiliationRepository;
  let repository: FakeUsersRepository;
  let service: UsersService;

  beforeEach(() => {
    affiliations = new FakeAffiliationRepository();
    repository = new FakeUsersRepository();
    service = new UsersService(repository, affiliations);
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it('닉네임이 없으면 사용 가능하다고 응답한다', async () => {
    repository.nicknameExists = false;

    await expect(
      service.checkNicknameAvailability('available-nickname'),
    ).resolves.toEqual({
      available: true,
    });

    expect(repository.checkedNickname).toBe('available-nickname');
  });

  it('닉네임이 있으면 사용 불가하다고 응답한다', async () => {
    repository.nicknameExists = true;

    await expect(
      service.checkNicknameAvailability('taken-nickname'),
    ).resolves.toEqual({
      available: false,
    });
  });

  it('랜덤 후보가 비어 있으면 해당 닉네임을 추천한다', async () => {
    Math.random = () => 0;

    await expect(service.suggestNickname()).resolves.toEqual({
      nickname: '행복한 라이온',
    });

    expect(repository.checkedNicknames).toEqual(['행복한 라이온']);
  });

  it('첫 추천 후보가 중복이면 다음 사용 가능한 닉네임을 추천한다', async () => {
    Math.random = () => 0;
    repository.takenNicknames.add('행복한 라이온');

    await expect(service.suggestNickname()).resolves.toEqual({
      nickname: '행복한 메타몽',
    });

    expect(repository.checkedNicknames).toEqual(['행복한 라이온', '행복한 메타몽']);
  });

  it('모든 추천 후보가 중복이면 추천 불가 예외를 던진다', async () => {
    repository.allNicknamesTaken = true;

    await expect(service.suggestNickname()).rejects.toBeInstanceOf(
      NicknameSuggestionUnavailableException,
    );
  });

  it('회원가입하면 비밀번호를 해시하고 기본 voteToken을 가진 사용자를 만든다', async () => {
    affiliations.affiliation = { code: 'education' } as Affiliation;

    const result = await service.create({
      affiliationCode: 'education',
      nickname: 'new-user',
      password: 'password123',
    });

    expect(result).toEqual({ id: repository.createdUser?.id });
    expect(repository.createdUser).toMatchObject({
      affiliation: affiliations.affiliation,
      nickname: 'new-user',
      voteToken: 1000,
    });
    expect(repository.createdUser?.passwordHash).not.toBe('password123');
    expect(repository.createdUser?.passwordHash).toMatch(/^scrypt:/);
  });

  it('중복 닉네임이면 회원가입을 거절한다', async () => {
    repository.nicknameExists = true;

    await expect(
      service.create({
        affiliationCode: 'education',
        nickname: 'taken-user',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(NicknameAlreadyExistsException);
  });

  it('저장 중 DB 중복키 오류가 나도 conflict로 거절한다', async () => {
    repository.createError = Object.assign(new Error('duplicate key'), {
      code: 'ER_DUP_ENTRY',
    });

    await expect(
      service.create({
        affiliationCode: 'education',
        nickname: 'race-user',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(NicknameAlreadyExistsException);
  });

  it('없는 소속 code이면 회원가입을 거절한다', async () => {
    affiliations.affiliation = null;

    await expect(
      service.create({
        affiliationCode: 'missing',
        nickname: 'new-user',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(InvalidAffiliationException);
  });
});

class FakeAffiliationRepository implements AffiliationRepository {
  affiliation: Affiliation | null = { code: 'education' } as Affiliation;

  findByCode(): Promise<Affiliation | null> {
    return Promise.resolve(this.affiliation);
  }

  findSummaries(): Promise<never[]> {
    return Promise.resolve([]);
  }
}

class FakeUsersRepository implements UsersRepository {
  checkedNickname?: string;
  checkedNicknames: string[] = [];
  createError?: Error;
  createdUser?: User;
  allNicknamesTaken = false;
  nicknameExists = false;
  takenNicknames = new Set<string>();

  existsByNickname(nickname: string): Promise<boolean> {
    this.checkedNickname = nickname;
    this.checkedNicknames.push(nickname);

    return Promise.resolve(
      this.allNicknamesTaken ||
        this.nicknameExists ||
        this.takenNicknames.has(nickname),
    );
  }

  findAffiliationsByIds(): Promise<never[]> {
    return Promise.resolve([]);
  }

  findById(): Promise<User | null> {
    return Promise.resolve(null);
  }

  findByNickname(): Promise<User | null> {
    return Promise.resolve(null);
  }

  create(user: User): Promise<User> {
    if (this.createError) {
      return Promise.reject(this.createError);
    }

    this.createdUser = user;

    return Promise.resolve(user);
  }
}
