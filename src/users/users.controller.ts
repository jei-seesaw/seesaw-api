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
  NicknameSuggestionResponseDto,
} from './dto/nickname-availability.dto';
import { UsersService } from './users.service';
import {
  ApiCheckNicknameAvailability,
  ApiCreateUser,
  ApiSuggestNickname,
  ApiUsersController,
} from './users.swagger';

@ApiUsersController()
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateUser()
  create(@Body() dto: CreateUserRequestDto): Promise<CreateUserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get('users/nickname-availability')
  @HttpCode(HttpStatus.OK)
  @ApiCheckNicknameAvailability()
  checkNicknameAvailability(
    @Query() query: NicknameAvailabilityQueryDto,
  ): Promise<NicknameAvailabilityResponseDto> {
    return this.usersService.checkNicknameAvailability(query.nickname);
  }

  @Get('users/nickname-suggestion')
  @HttpCode(HttpStatus.OK)
  @ApiSuggestNickname()
  suggestNickname(): Promise<NicknameSuggestionResponseDto> {
    return this.usersService.suggestNickname();
  }
}
