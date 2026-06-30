import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class NicknameAvailabilityQueryDto {
  @IsString()
  @Length(1, 120)
  nickname!: string;
}

export class NicknameAvailabilityResponseDto {
  @ApiProperty()
  available!: boolean;
}
