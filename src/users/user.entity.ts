import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/decorators/legacy';
import { randomUUID } from 'node:crypto';
import { Affiliation } from '../affiliations/affiliation.entity';

@Entity({ tableName: 'users' })
export class User {
  @PrimaryKey({ type: 'string', length: 36 })
  id: string = randomUUID();

  @Property({ type: 'string', length: 120, unique: true })
  nickname: string;

  @Property({ type: 'string', length: 255, fieldName: 'password_hash' })
  passwordHash: string;

  @ManyToOne(() => Affiliation, {
    fieldName: 'affiliation_code',
    nullable: true,
  })
  affiliation: Affiliation | null = null;

  @Property({
    columnType: 'int',
    default: 0,
    fieldName: 'vote_token',
    type: 'number',
  })
  voteToken: number = 0;

  @Property({ type: Date, fieldName: 'created_at' })
  createdAt: Date = new Date();

  constructor(nickname: string, passwordHash: string) {
    this.nickname = nickname;
    this.passwordHash = passwordHash;
  }
}
