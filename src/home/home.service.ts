import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { UsersRepository } from '../users/users.repository';
import { VoteEventsRepository } from '../vote-events/vote-events.repository';
import type { HomeSummaryResponseDto } from './dto/home-summary.dto';

@Injectable()
export class HomeService {
  constructor(
    private readonly voteEvents: VoteEventsRepository,
    private readonly users: UsersRepository,
  ) {}

  async getHome(user?: AuthenticatedUser): Promise<HomeSummaryResponseDto> {
    const summary = await this.voteEvents.getSummary();

    if (!user) {
      return { ...summary, isLoggedIn: false };
    }

    const foundUser = await this.users.findById(user.id);

    return foundUser
      ? { ...summary, isLoggedIn: true, voteToken: foundUser.voteToken }
      : { ...summary, isLoggedIn: false };
  }
}
