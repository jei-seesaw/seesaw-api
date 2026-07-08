import { EntityRepository } from '@mikro-orm/mariadb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { User } from './user.entity';

export interface UserAffiliationSummary {
  affiliationCode: string;
  affiliationName: string;
  userId: string;
}

export abstract class UsersRepository {
  abstract create(user: User): Promise<User>;
  abstract existsByNickname(nickname: string): Promise<boolean>;
  abstract findAffiliationsByIds(
    userIds: string[],
  ): Promise<UserAffiliationSummary[]>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByNickname(nickname: string): Promise<User | null>;
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

  async findAffiliationsByIds(
    userIds: string[],
  ): Promise<UserAffiliationSummary[]> {
    if (userIds.length === 0) {
      return [];
    }

    const placeholders = userIds.map(() => '?').join(', ');
    const rows = await this.users
      .getEntityManager()
      .getConnection()
      .execute<UserAffiliationRow[]>(
        `select u.\`id\` as \`userId\`, a.\`code\` as \`affiliationCode\`, a.\`name\` as \`affiliationName\` from \`users\` u join \`affiliations\` a on a.\`code\` = u.\`affiliation_code\` where u.\`id\` in (${placeholders})`,
        userIds,
      );

    return rows.map((row) => ({
      affiliationCode: row.affiliationCode,
      affiliationName: row.affiliationName,
      userId: row.userId,
    }));
  }

  findById(id: string): Promise<User | null> {
    return this.users.getEntityManager().fork().findOne(User, { id });
  }

  findByNickname(nickname: string): Promise<User | null> {
    return this.users.findOne({ nickname });
  }
}

interface UserAffiliationRow {
  affiliationCode: string;
  affiliationName: string;
  userId: string;
}
