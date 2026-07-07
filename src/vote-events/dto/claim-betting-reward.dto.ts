import { ApiProperty } from '@nestjs/swagger';

export class ClaimBettingRewardResponseDto {
  @ApiProperty({
    description: '수령 시 지급되는 총 토큰 수. 패자는 null',
    example: 40,
    nullable: true,
    type: Number,
  })
  earnedTokenAmount!: number | null;

  @ApiProperty({ description: '보상 수령 처리 완료 여부', example: true })
  rewardClaimed!: true;
}
