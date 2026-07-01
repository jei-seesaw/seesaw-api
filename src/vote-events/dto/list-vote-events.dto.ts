import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListVoteEventsQueryDto {
  @ApiPropertyOptional({
    default: 20,
    description: '한 번에 조회할 투표 이벤트 수',
    maximum: 50,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;

  @ApiPropertyOptional({
    description: '다음 페이지 조회용 opaque cursor',
    example: 'eyJpZCI6IjhmNmQzYjJhLTljNGUtNGYyYi04YTFkLTZlMGYzYzJiMWE5MCJ9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class VoteEventListItemDto {
  @ApiProperty({ example: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90' })
  id!: string;

  @ApiProperty({ description: '카테고리 이름', example: '배팅' })
  categoryName!: string;

  @ApiProperty({ description: '마감까지 남은 시간', example: '12:34:56' })
  remainingTime!: string;

  @ApiProperty({ description: '투표 제목', example: '점심 메뉴는?' })
  title!: string;

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
    example: 25,
    nullable: true,
    type: Number,
  })
  optionARatio!: number | null;

  @ApiProperty({
    description: 'B 선택지 비율',
    example: 75,
    nullable: true,
    type: Number,
  })
  optionBRatio!: number | null;

  @ApiProperty({ description: '총 참여자 수', example: 120 })
  totalParticipantCount!: number;

  @ApiProperty({
    description: '총 참여 토큰 수',
    example: 1000,
    nullable: true,
    type: Number,
  })
  totalTokenAmount!: number | null;

  @ApiProperty({ description: '현재 사용자의 투표 참여 여부', example: true })
  isParticipated!: boolean;
}

export class ListVoteEventsPageInfoDto {
  @ApiProperty({ example: false })
  hasNext!: boolean;

  @ApiProperty({
    example: null,
    nullable: true,
    type: String,
  })
  nextCursor!: string | null;
}

export class ListVoteEventsResponseDto {
  @ApiProperty({
    nullable: true,
    type: () => VoteEventListItemDto,
  })
  mainVote!: VoteEventListItemDto | null;

  @ApiProperty({ type: () => [VoteEventListItemDto] })
  otherVoteEvents!: VoteEventListItemDto[];

  @ApiProperty({ type: () => ListVoteEventsPageInfoDto })
  pageInfo!: ListVoteEventsPageInfoDto;
}

export class ListCompletedVoteEventsResponseDto {
  @ApiProperty({ type: () => [VoteEventListItemDto] })
  voteEvents!: VoteEventListItemDto[];

  @ApiProperty({ type: () => ListVoteEventsPageInfoDto })
  pageInfo!: ListVoteEventsPageInfoDto;
}
