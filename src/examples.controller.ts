import { BadRequestException, Controller, Get } from '@nestjs/common';

@Controller('examples')
export class ExamplesController {
  @Get('error')
  getError(): never {
    throw new BadRequestException('Example error');
  }
}
