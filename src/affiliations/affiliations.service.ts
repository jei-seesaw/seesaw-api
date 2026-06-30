import { EntityRepository } from '@mikro-orm/mariadb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Affiliation } from './affiliation.entity';
import { AffiliationResponseDto } from './dto/affiliation.dto';

@Injectable()
export class AffiliationsService {
  constructor(
    @InjectRepository(Affiliation)
    private readonly affiliations: EntityRepository<Affiliation>,
  ) {}

  async list(): Promise<AffiliationResponseDto[]> {
    const affiliations = await this.affiliations.find(
      {},
      { fields: ['code', 'name'], orderBy: { name: 'asc' } },
    );

    return affiliations.map(({ code, name }) => ({ code, name }));
  }
}
