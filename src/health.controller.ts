import { Controller, Get } from '@nestjs/common';
import { ApiGetHealth, ApiHealthController } from './health.swagger';

@ApiHealthController()
@Controller('health')
export class HealthController {
  @Get()
  @ApiGetHealth()
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
