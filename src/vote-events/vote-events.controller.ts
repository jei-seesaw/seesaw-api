import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import {
  CreateVoteEventRequestDto,
  CreateVoteEventResponseDto,
} from './dto/create-vote-event.dto';
import {
  ListCompletedVoteEventsResponseDto,
  ListVoteEventsQueryDto,
  ListVoteEventsResponseDto,
} from './dto/list-vote-events.dto';
import { VoteEventsService } from './vote-events.service';
import {
  ApiCreateVoteEvent,
  ApiListCompletedVoteEvents,
  ApiListVoteEvents,
  ApiVoteEventsController,
} from './vote-events.swagger';

@ApiVoteEventsController()
@Controller()
export class VoteEventsController {
  constructor(private readonly voteEventsService: VoteEventsService) {}

  @Get('ongoing-vote-events')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiListVoteEvents()
  list(
    @Query() query: ListVoteEventsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListVoteEventsResponseDto> {
    return this.voteEventsService.listOngoing(query, request.user);
  }

  @Get('completed-vote-events')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiListCompletedVoteEvents()
  listCompleted(
    @Query() query: ListVoteEventsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListCompletedVoteEventsResponseDto> {
    return this.voteEventsService.listCompleted(query, request.user);
  }

  @Post('vote-events')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiCreateVoteEvent()
  create(
    @Body() dto: CreateVoteEventRequestDto,
  ): Promise<CreateVoteEventResponseDto> {
    return this.voteEventsService.create(dto);
  }
}
