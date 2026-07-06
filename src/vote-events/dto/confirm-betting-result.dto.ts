import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { VoteEventSelectedOption } from './vote-event-detail.dto';

export class ConfirmBettingResultRequestDto {
  @ApiProperty({
    description: '정답 선택지',
    enum: ['A', 'B'],
    example: 'A',
  })
  @IsIn(['A', 'B'])
  winningOption!: VoteEventSelectedOption;
}
