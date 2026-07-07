import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ClaimBettingRewardResponseDto } from './dto/claim-betting-reward.dto';
import { ConfirmBettingResultRequestDto } from './dto/confirm-betting-result.dto';
import { CastVoteRequestDto } from './dto/cast-vote.dto';
import { VoteEventDetailResponseDto } from './dto/vote-event-detail.dto';
import {
  ListCompletedVoteEventsResponseDto,
  ListVoteEventsQueryDto,
  ListVoteEventsResponseDto,
} from './dto/list-vote-events.dto';
import { VoteEventsService } from './vote-events.service';
import {
  ApiCreateVoteEvent,
  ApiClaimBettingReward,
  ApiConfirmBettingResult,
  ApiGetVoteEventDetail,
  ApiListCreatedVoteEvents,
  ApiListCompletedVoteEvents,
  ApiListParticipatedVoteEvents,
  ApiListVoteEvents,
  ApiVote,
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

  @Get('me/created-vote-events')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiListCreatedVoteEvents()
  listCreatedByMe(
    @Query() query: ListVoteEventsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListCompletedVoteEventsResponseDto> {
    return this.voteEventsService.listCreatedByUser(query, request.user!);
  }

  @Get('me/participated-vote-events')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiListParticipatedVoteEvents()
  listParticipatedByMe(
    @Query() query: ListVoteEventsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListCompletedVoteEventsResponseDto> {
    return this.voteEventsService.listParticipatedByUser(query, request.user!);
  }

  @Get('vote-events/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiGetVoteEventDetail()
  getDetail(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<VoteEventDetailResponseDto> {
    return this.voteEventsService.getDetail(id, request.user);
  }

  @Post('vote-events')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiCreateVoteEvent()
  create(
    @Body() dto: CreateVoteEventRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CreateVoteEventResponseDto> {
    return this.voteEventsService.create(dto, request.user!);
  }

  @Post('vote-events/:id/betting-result')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiConfirmBettingResult()
  confirmBettingResult(
    @Param('id') id: string,
    @Body() dto: ConfirmBettingResultRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<null> {
    return this.voteEventsService.confirmBettingResult(id, dto, request.user!);
  }

  @Post('vote-events/:id/betting-reward/claim')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiClaimBettingReward()
  claimBettingReward(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ClaimBettingRewardResponseDto> {
    return this.voteEventsService.claimBettingReward(id, request.user!);
  }

  @Post('vote')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiVote()
  vote(
    @Body() dto: CastVoteRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<null> {
    return this.voteEventsService.vote(dto, request.user!);
  }
}
