import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Length, Min, ValidateIf } from 'class-validator';
import type { VoteEventSelectedOption } from './vote-event-detail.dto';

export class CastVoteRequestDto {
  @ApiProperty({
    description: '투표 이벤트 ID',
    example: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
    maxLength: 36,
    minLength: 1,
  })
  @IsString()
  @Length(1, 36)
  voteEventId!: string;

  @ApiProperty({
    description: '선택한 선택지',
    enum: ['A', 'B'],
    example: 'A',
  })
  @IsIn(['A', 'B'])
  selectedOption!: VoteEventSelectedOption;

  @ApiPropertyOptional({
    description: '배팅 투표에 사용할 토큰 수',
    example: 25,
    minimum: 1,
  })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tokenAmount?: number;
}
