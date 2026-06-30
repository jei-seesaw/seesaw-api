import { NotFoundException } from '@nestjs/common';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let repository: FakeUsersRepository;
  let service: UsersService;

  beforeEach(() => {
    repository = new FakeUsersRepository();
    service = new UsersService(repository);
  });

  it('creates users through the repository', async () => {
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

  it('throws not found when the repository has no user', async () => {
    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
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
