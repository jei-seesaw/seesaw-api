import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateUserRequestDto,
  CreateUserResponseDto,
} from './dto/create-user.dto';
import {
  NicknameAvailabilityQueryDto,
  NicknameAvailabilityResponseDto,
} from './dto/nickname-availability.dto';
import { UsersService } from './users.service';
import {
  ApiCheckNicknameAvailability,
  ApiCreateUser,
  ApiUsersController,
} from './users.swagger';

@ApiUsersController()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateUser()
  create(@Body() dto: CreateUserRequestDto): Promise<CreateUserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get('nickname-availability')
  @HttpCode(HttpStatus.OK)
  @ApiCheckNicknameAvailability()
  checkNicknameAvailability(
    @Query() query: NicknameAvailabilityQueryDto,
  ): Promise<NicknameAvailabilityResponseDto> {
    return this.usersService.checkNicknameAvailability(query.nickname);
  }
}
