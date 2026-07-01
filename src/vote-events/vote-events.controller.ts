import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateVoteEventRequestDto,
  CreateVoteEventResponseDto,
} from './dto/create-vote-event.dto';
import { VoteEventsService } from './vote-events.service';
import {
  ApiCreateVoteEvent,
  ApiVoteEventsController,
} from './vote-events.swagger';

@ApiVoteEventsController()
@Controller('vote-events')
export class VoteEventsController {
  constructor(private readonly voteEventsService: VoteEventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiCreateVoteEvent()
  create(
    @Body() dto: CreateVoteEventRequestDto,
  ): Promise<CreateVoteEventResponseDto> {
    return this.voteEventsService.create(dto);
  }
}
