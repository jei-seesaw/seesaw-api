import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateUserRequestDto {
  @ApiProperty({ maxLength: 120, minLength: 1 })
  @IsString()
  @Length(1, 120)
  nickname!: string;

  @ApiProperty({ maxLength: 128, minLength: 8, writeOnly: true })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiProperty({ maxLength: 50, minLength: 1 })
  @IsString()
  @Length(1, 50)
  affiliationCode!: string;
}

export class CreateUserResponseDto {
  @ApiProperty()
  id!: string;
}
