import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListChatMessagesQueryDto {
  @ApiPropertyOptional({
    default: 50,
    description: '한 번에 조회할 채팅 메시지 수',
    maximum: 50,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 50;

  @ApiPropertyOptional({
    description: '이전 메시지 페이지 조회용 opaque cursor',
    example: 'eyJ2ZXJzaW9uIjoxLCJjcmVhdGVkQXQiOiIyMDI2LTA3LTA4VDEyOjAwOjAwLjAwMFoiLCJpZCI6IjhmNmQzYjJhLTljNGUtNGYyYi04YTFkLTZlMGYzYzJiMWE5MCJ9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class ChatMessageUserDto {
  @ApiProperty({ example: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90' })
  id!: string;

  @ApiProperty({ example: 'hyoseok' })
  nickname!: string;

  @ApiProperty({ example: '재능교육' })
  affiliationName!: string;
}

export class ChatMessageDto {
  @ApiProperty({ example: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90' })
  id!: string;

  @ApiProperty({ example: '7c1b6a57-9e4c-48de-a893-7c1d8f4d54fd' })
  voteEventId!: string;

  @ApiProperty({ example: 'c98e6e39-5e83-4308-8f43-a7f5c6f33120' })
  clientMessageId!: string;

  @ApiProperty({ type: () => ChatMessageUserDto })
  user!: ChatMessageUserDto;

  @ApiProperty({ example: '저는 A가 더 좋아요' })
  content!: string;

  @ApiProperty({
    example: '2026-07-08T12:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({ example: true })
  isMine?: boolean;
}

export class ChatMessagesPageInfoDto {
  @ApiProperty({ example: false })
  hasNext!: boolean;

  @ApiProperty({
    example: null,
    nullable: true,
    type: String,
  })
  nextCursor!: string | null;
}

export class ListChatMessagesResponseDto {
  @ApiProperty({ type: () => [ChatMessageDto] })
  messages!: ChatMessageDto[];

  @ApiProperty({ type: () => ChatMessagesPageInfoDto })
  pageInfo!: ChatMessagesPageInfoDto;
}
