import { EntityRepository } from '@mikro-orm/mariadb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.entity';

export abstract class UsersRepository {
  abstract create(dto: CreateUserDto): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
}

@Injectable()
export class MikroOrmUsersRepository implements UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly users: EntityRepository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = new User(dto.email, dto.name);

    await this.users.insert(user);

    const persistedUser = await this.findById(user.id);

    if (!persistedUser) {
      throw new Error('Created user was not found');
    }

    return persistedUser;
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ id });
  }
}
