import { BadRequestException, Controller, Get } from '@nestjs/common';
import { ApiExamplesController, ApiGetExampleError } from './examples.swagger';

@ApiExamplesController()
@Controller('examples')
export class ExamplesController {
  @Get('error')
  @ApiGetExampleError()
  getError(): never {
    throw new BadRequestException('Example error');
  }
}
