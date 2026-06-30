import { Injectable } from '@nestjs/common';
import { AffiliationRepository } from './affiliations.repository';
import { AffiliationResponseDto } from './dto/affiliation.dto';

@Injectable()
export class AffiliationsService {
  constructor(private readonly affiliations: AffiliationRepository) {}

  async list(): Promise<AffiliationResponseDto[]> {
    const affiliations = await this.affiliations.findSummaries();

    return affiliations.map(({ code, name }) => ({ code, name }));
  }
}
