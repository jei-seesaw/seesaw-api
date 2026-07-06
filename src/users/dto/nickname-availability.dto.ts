import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class NicknameAvailabilityQueryDto {
  @IsString()
  @Length(1, 120)
  nickname!: string;
}

export class NicknameAvailabilityResponseDto {
  @ApiProperty({
    description: '닉네임 사용 가능 여부',
    example: true,
  })
  available!: boolean;
}

export class NicknameSuggestionResponseDto {
  @ApiProperty({
    description: '추천 닉네임',
    example: '행복한 라이온',
  })
  nickname!: string;
}
