import { User } from '../../src/users/user.entity';
import { UserNotFoundException } from '../../src/users/users.exception';
import { UsersRepository } from '../../src/users/users.repository';
import { UsersService } from '../../src/users/users.service';

describe('UsersService', () => {
  let repository: FakeUsersRepository;
  let service: UsersService;

  beforeEach(() => {
    repository = new FakeUsersRepository();
    service = new UsersService(repository);
  });

  it('repository를 통해 사용자를 생성한다', async () => {
    const user = new User('alice@example.com', 'Alice');
    repository.createdUser = user;

    await expect(
      service.create({ email: 'alice@example.com', name: 'Alice' }),
    ).resolves.toEqual({
      id: user.id,
      email: 'alice@example.com',
      name: 'Alice',
      createdAt: user.createdAt.toISOString(),
    });

    expect(repository.createdWith).toEqual({
      email: 'alice@example.com',
      name: 'Alice',
    });
  });

  it('repository에 사용자가 없으면 사용자 없음 예외를 던진다', async () => {
    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });
});

class FakeUsersRepository implements UsersRepository {
  createdUser?: User;
  createdWith?: unknown;

  create(dto: unknown): Promise<User> {
    this.createdWith = dto;

    return Promise.resolve(
      this.createdUser ?? new User('created@example.com', 'Created'),
    );
  }

  findById(): Promise<User | null> {
    return Promise.resolve(null);
  }
}
