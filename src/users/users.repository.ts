import { EntityRepository } from '@mikro-orm/mariadb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { User } from './user.entity';

export abstract class UsersRepository {
  abstract create(user: User): Promise<User>;
  abstract existsByNickname(nickname: string): Promise<boolean>;
}

@Injectable()
export class MikroOrmUsersRepository implements UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly users: EntityRepository<User>,
  ) {}

  async create(user: User): Promise<User> {
    const em = this.users.getEntityManager();

    await em.persist(user).flush();

    return user;
  }

  async existsByNickname(nickname: string): Promise<boolean> {
    return (await this.users.findOne({ nickname })) !== null;
  }
}
