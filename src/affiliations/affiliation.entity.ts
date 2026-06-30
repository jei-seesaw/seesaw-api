import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'affiliations' })
export class Affiliation {
  @PrimaryKey({ type: 'string', length: 50 })
  code: string;

  @Property({ type: 'string', length: 50 })
  name: string;

  @Property({ type: Date, fieldName: 'created_at' })
  createdAt: Date = new Date();

  constructor(code: string, name: string) {
    this.code = code;
    this.name = name;
  }
}
