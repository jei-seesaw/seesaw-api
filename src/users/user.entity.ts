import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { randomUUID } from 'node:crypto';

@Entity({ tableName: 'users' })
export class User {
  @PrimaryKey({ type: 'string', length: 36 })
  id: string = randomUUID();

  @Property({ type: 'string', length: 255 })
  email: string;

  @Property({ type: 'string', length: 120 })
  name: string;

  @Property({ type: Date, fieldName: 'created_at' })
  createdAt: Date = new Date();

  constructor(email: string, name: string) {
    this.email = email;
    this.name = name;
  }
}
