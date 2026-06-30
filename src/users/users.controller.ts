import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  NicknameAvailabilityQueryDto,
  NicknameAvailabilityResponseDto,
} from './dto/nickname-availability.dto';
import { UsersService } from './users.service';
import {
  ApiCheckNicknameAvailability,
  ApiUsersController,
} from './users.swagger';

@ApiUsersController()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('nickname-availability')
  @HttpCode(HttpStatus.OK)
  @ApiCheckNicknameAvailability()
  checkNicknameAvailability(
    @Query() query: NicknameAvailabilityQueryDto,
  ): Promise<NicknameAvailabilityResponseDto> {
    return this.usersService.checkNicknameAvailability(query.nickname);
  }
}
