import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  AuthenticatedRequest,
  OptionalJwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { HomeSummaryResponseDto } from './dto/home-summary.dto';
import { HomeService } from './home.service';
import { ApiGetHome, ApiHomeController } from './home.swagger';

@ApiHomeController()
@Controller('home')
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiGetHome()
  getHome(
    @Req() request: AuthenticatedRequest,
  ): Promise<HomeSummaryResponseDto> {
    return this.home.getHome(request.user);
  }
}
