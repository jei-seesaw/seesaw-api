import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Affiliation } from './affiliation.entity';
import { AffiliationsController } from './affiliations.controller';
import {
  AffiliationRepository,
  MikroOrmAffiliationRepository,
} from './affiliations.repository';
import { AffiliationsService } from './affiliations.service';

@Module({
  imports: [MikroOrmModule.forFeature([Affiliation])],
  controllers: [AffiliationsController],
  providers: [
    AffiliationsService,
    {
      provide: AffiliationRepository,
      useClass: MikroOrmAffiliationRepository,
    },
  ],
  exports: [AffiliationRepository],
})
export class AffiliationsModule {}
