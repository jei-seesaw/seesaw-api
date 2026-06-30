import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateUserRequestDto {
  @ApiProperty({
    description: '사용자 닉네임',
    example: 'seesaw-user',
    maxLength: 120,
    minLength: 1,
  })
  @IsString()
  @Length(1, 120)
  nickname!: string;

  @ApiProperty({
    description: '사용자 비밀번호',
    example: 'password123',
    maxLength: 128,
    minLength: 8,
    writeOnly: true,
  })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiProperty({
    description: '소속 코드',
    example: 'teacher',
    maxLength: 50,
    minLength: 1,
  })
  @IsString()
  @Length(1, 50)
  affiliationCode!: string;
}

export class CreateUserResponseDto {
  @ApiProperty({ example: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90' })
  id!: string;
}
