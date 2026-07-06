import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export const VOTE_EVENT_CATEGORIES = [
  'betting',
  'daily',
  'balance',
  'work',
] as const;

export type VoteEventCategory = (typeof VOTE_EVENT_CATEGORIES)[number];

const ISO_DATE_TIME_WITH_TIMEZONE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export class CreateVoteEventRequestDto {
  @ApiProperty({
    description: '투표 이벤트 카테고리',
    enum: VOTE_EVENT_CATEGORIES,
    example: 'betting',
  })
  @IsIn(VOTE_EVENT_CATEGORIES)
  category!: VoteEventCategory;

  @ApiProperty({
    description: '투표 이벤트 제목',
    example: '점심 메뉴는?',
    maxLength: 120,
    minLength: 1,
  })
  @IsString()
  @Length(1, 120)
  title!: string;

  @ApiProperty({
    description:
      '투표 마감 시각. ISO 8601 date-time 문자열이며 명시적 timezone과 정각 단위가 필요합니다.',
    example: '2026-07-06T11:00:00+09:00',
    format: 'date-time',
  })
  @IsString()
  @Matches(ISO_DATE_TIME_WITH_TIMEZONE_PATTERN)
  @IsISO8601({ strict: true })
  deadlineAt!: string;

  @ApiProperty({
    description: 'A 선택지',
    example: '김치찌개',
    maxLength: 120,
    minLength: 1,
  })
  @IsString()
  @Length(1, 120)
  optionA!: string;

  @ApiProperty({
    description: 'B 선택지',
    example: '돈까스',
    maxLength: 120,
    minLength: 1,
  })
  @IsString()
  @Length(1, 120)
  optionB!: string;

  @ApiPropertyOptional({
    description: 'A 선택지 이미지 URL',
    example: null,
    maxLength: 2048,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @Length(1, 2048)
  optionAImageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'B 선택지 이미지 URL',
    example: 'https://example.com/b.jpg',
    maxLength: 2048,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @Length(1, 2048)
  optionBImageUrl?: string | null;
}

export class CreateVoteEventResponseDto {
  @ApiProperty({ example: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90' })
  id!: string;
}
