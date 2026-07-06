import { ApiProperty } from '@nestjs/swagger';

export type VoteEventSelectedOption = 'A' | 'B';

export class VoteEventAffiliationStatDto {
  @ApiProperty({ description: '소속 코드', example: 'education' })
  affiliationCode!: string;

  @ApiProperty({ description: '소속 이름', example: '재능교육' })
  affiliationName!: string;

  @ApiProperty({ description: 'A 선택지 선택 비율', example: 75 })
  optionARatio!: number;

  @ApiProperty({ description: 'B 선택지 선택 비율', example: 25 })
  optionBRatio!: number;
}

export class VoteEventDetailResponseDto {
  @ApiProperty({ description: '카테고리 이름', example: '배팅' })
  categoryName!: string;

  @ApiProperty({ description: '투표 제목', example: '점심 메뉴는?' })
  title!: string;

  @ApiProperty({ description: '총 참여자 수', example: 3 })
  totalParticipantCount!: number;

  @ApiProperty({
    description: '진행중이면 마감까지 남은 시간, 완료되었으면 null',
    example: '12:34:56',
    nullable: true,
    type: String,
  })
  remainingTime!: string | null;

  @ApiProperty({ description: 'A 선택지', example: '김치찌개' })
  optionA!: string;

  @ApiProperty({ description: 'B 선택지', example: '돈까스' })
  optionB!: string;

  @ApiProperty({
    description: 'A 선택지 이미지 URL',
    example: null,
    nullable: true,
    type: String,
  })
  optionAImageUrl!: string | null;

  @ApiProperty({
    description: 'B 선택지 이미지 URL',
    example: 'https://example.com/b.jpg',
    nullable: true,
    type: String,
  })
  optionBImageUrl!: string | null;

  @ApiProperty({
    description: 'A 선택지 비율',
    example: 40,
    nullable: true,
    type: Number,
  })
  optionARatio!: number | null;

  @ApiProperty({
    description: 'B 선택지 비율',
    example: 60,
    nullable: true,
    type: Number,
  })
  optionBRatio!: number | null;

  @ApiProperty({
    description: 'A 선택지 투표 수 또는 토큰 수',
    example: 40,
    nullable: true,
    type: Number,
  })
  optionAResultAmount!: number | null;

  @ApiProperty({
    description: 'B 선택지 투표 수 또는 토큰 수',
    example: 60,
    nullable: true,
    type: Number,
  })
  optionBResultAmount!: number | null;

  @ApiProperty({
    description: '소속별 선택 비율',
    nullable: true,
    type: () => [VoteEventAffiliationStatDto],
  })
  affiliationStats!: VoteEventAffiliationStatDto[] | null;

  @ApiProperty({ description: '현재 사용자의 투표 참여 여부', example: true })
  isParticipated!: boolean;

  @ApiProperty({ description: '현재 사용자의 투표 이벤트 주최자 여부', example: true })
  isOrganizer!: boolean;

  @ApiProperty({
    description: '현재 사용자가 선택한 선택지',
    enum: ['A', 'B'],
    example: 'B',
    nullable: true,
  })
  selectedOption!: VoteEventSelectedOption | null;

  @ApiProperty({
    description: '총 참여 토큰 수',
    example: 100,
    nullable: true,
    type: Number,
  })
  totalTokenAmount!: number | null;

  @ApiProperty({
    description: '확정된 배팅 정답 선택지',
    enum: ['A', 'B'],
    example: 'A',
    nullable: true,
  })
  bettingResultOption!: VoteEventSelectedOption | null;

  @ApiProperty({
    description: '배팅 정답 확정 시각',
    example: '2026-07-06T01:02:03.000Z',
    nullable: true,
    type: String,
  })
  bettingResultConfirmedAt!: string | null;

  @ApiProperty({
    description: '현재 사용자의 배팅 결과 확정 가능 여부',
    example: true,
  })
  canConfirmBettingResult!: boolean;
}
