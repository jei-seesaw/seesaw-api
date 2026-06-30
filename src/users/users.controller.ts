import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import type { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import {
  ApiCreateUser,
  ApiGetUser,
  ApiUsersController,
} from './users.swagger';

@ApiUsersController()
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiCreateUser()
  async create(
    @Body() dto: CreateUserDto,
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto);

    response.status(HttpStatus.CREATED);
    response.setHeader('Location', `/api/v1/users/${user.id}`);

    return user;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiGetUser()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }
}

interface HeaderResponse {
  status(code: number): unknown;
  setHeader(name: string, value: string): unknown;
}
