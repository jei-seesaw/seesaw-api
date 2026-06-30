import { UsersRepository } from '../../src/users/users.repository';
import { UsersService } from '../../src/users/users.service';

describe('UsersService', () => {
  let repository: FakeUsersRepository;
  let service: UsersService;

  beforeEach(() => {
    repository = new FakeUsersRepository();
    service = new UsersService(repository);
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

});

class FakeUsersRepository implements UsersRepository {
  checkedNickname?: string;
  nicknameExists = false;

  existsByNickname(nickname: string): Promise<boolean> {
    this.checkedNickname = nickname;

    return Promise.resolve(this.nicknameExists);
  }
}
