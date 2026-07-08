import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { ChatsService } from './chats.service';
import {
  ApiChatsController,
  ApiListChatMessages,
} from './chats.swagger';
import {
  ListChatMessagesQueryDto,
  ListChatMessagesResponseDto,
} from './dto/list-chat-messages.dto';

@ApiChatsController()
@Controller('vote-events/:id/chat-messages')
export class ChatsController {
  constructor(private readonly chats: ChatsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiListChatMessages()
  list(
    @Param('id') id: string,
    @Query() query: ListChatMessagesQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListChatMessagesResponseDto> {
    return this.chats.listMessages(id, query, request.user!);
  }
}
