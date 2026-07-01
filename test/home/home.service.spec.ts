import { HomeService } from '../../src/home/home.service';
import { User } from '../../src/users/user.entity';
import { UsersRepository } from '../../src/users/users.repository';
import { VoteEventsRepository } from '../../src/vote-events/vote-events.repository';

describe('HomeService', () => {
  let users: FakeUsersRepository;
  let voteEvents: FakeVoteEventsRepository;
  let service: HomeService;

  beforeEach(() => {
    users = new FakeUsersRepository();
    voteEvents = new FakeVoteEventsRepository();
    service = new HomeService(voteEvents, users);
  });

  it('로그인하지 않은 메인페이지 요청에는 공개 집계만 반환한다', async () => {
    voteEvents.summary = {
      completedVoteEventCount: 1,
      ongoingVoteEventCount: 2,
      participantCount: 7,
    };

    await expect(service.getHome()).resolves.toEqual({
      completedVoteEventCount: 1,
      isLoggedIn: false,
      ongoingVoteEventCount: 2,
      participantCount: 7,
    });
  });

  it('로그인한 메인페이지 요청에는 내 voteToken을 함께 반환한다', async () => {
    voteEvents.summary = {
      completedVoteEventCount: 1,
      ongoingVoteEventCount: 2,
      participantCount: 7,
    };
    users.user = { id: 'user-id', voteToken: 777 } as User;

    await expect(
      service.getHome({ id: 'user-id', nickname: 'seesaw-user' }),
    ).resolves.toEqual({
      completedVoteEventCount: 1,
      isLoggedIn: true,
      ongoingVoteEventCount: 2,
      participantCount: 7,
      voteToken: 777,
    });
  });
});

class FakeVoteEventsRepository implements VoteEventsRepository {
  summary = {
    completedVoteEventCount: 0,
    ongoingVoteEventCount: 0,
    participantCount: 0,
  };

  create(): never {
    throw new Error('not used');
  }

  getSummary(): Promise<{
    completedVoteEventCount: number;
    ongoingVoteEventCount: number;
    participantCount: number;
  }> {
    return Promise.resolve(this.summary);
  }

  listOngoing(): never {
    throw new Error('not used');
  }
}

class FakeUsersRepository implements UsersRepository {
  user: User | null = null;

  create(): never {
    throw new Error('not used');
  }

  existsByNickname(): never {
    throw new Error('not used');
  }

  findById(): Promise<User | null> {
    return Promise.resolve(this.user);
  }

  findByNickname(): never {
    throw new Error('not used');
  }
}
