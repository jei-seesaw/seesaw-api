import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginRequestDto {
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
}

export class AccessTokenResponseDto {
  @ApiProperty({
    description: 'API 인증에 사용하는 JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;
}
