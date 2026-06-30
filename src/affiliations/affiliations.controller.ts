import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AffiliationResponseDto } from './dto/affiliation.dto';
import { AffiliationsService } from './affiliations.service';
import {
  ApiAffiliationsController,
  ApiListAffiliations,
} from './affiliations.swagger';

@ApiAffiliationsController()
@Controller('affiliations')
export class AffiliationsController {
  constructor(private readonly affiliationsService: AffiliationsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiListAffiliations()
  listAffiliations(): Promise<AffiliationResponseDto[]> {
    return this.affiliationsService.list();
  }
}
