import { EntityRepository } from '@mikro-orm/mariadb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Affiliation } from './affiliation.entity';

export interface AffiliationSummary {
  code: string;
  name: string;
}

export abstract class AffiliationRepository {
  abstract findByCode(code: string): Promise<Affiliation | null>;
  abstract findSummaries(): Promise<AffiliationSummary[]>;
}

@Injectable()
export class MikroOrmAffiliationRepository implements AffiliationRepository {
  constructor(
    @InjectRepository(Affiliation)
    private readonly affiliations: EntityRepository<Affiliation>,
  ) {}

  findByCode(code: string): Promise<Affiliation | null> {
    return this.affiliations.findOne({ code });
  }

  async findSummaries(): Promise<AffiliationSummary[]> {
    const affiliations = await this.affiliations.find(
      {},
      { fields: ['code', 'name'], orderBy: { name: 'asc' } },
    );

    return affiliations.map(({ code, name }) => ({ code, name }));
  }
}
