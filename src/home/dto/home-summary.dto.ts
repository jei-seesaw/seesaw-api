import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HomeSummaryResponseDto {
  @ApiProperty({
    description: '현재 요청의 로그인 여부',
    example: true,
  })
  isLoggedIn!: boolean;

  @ApiProperty({
    description: '진행중인 투표 이벤트 수',
    example: 8,
  })
  ongoingVoteEventCount!: number;

  @ApiProperty({
    description: '완료된 투표 이벤트 수',
    example: 4,
  })
  completedVoteEventCount!: number;

  @ApiProperty({
    description: '투표 이벤트에 참여한 참여자 수 합계',
    example: 128,
  })
  participantCount!: number;

  @ApiPropertyOptional({
    description: '로그인한 사용자의 현재 투표 토큰 수',
    example: 1000,
  })
  voteToken?: number;
}
