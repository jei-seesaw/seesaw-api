import type { VoteEventCategory } from './dto/create-vote-event.dto';
import type { VoteEventListSort } from './dto/list-vote-events.dto';
import type { VoteEventSelectedOption } from './dto/vote-event-detail.dto';
import type { VoteEvent } from './vote-event.entity';

export interface VoteEventsSummary {
  completedVoteEventCount: number;
  ongoingVoteEventCount: number;
  participantCount: number;
}

export interface VoteEventsListCursor {
  category: VoteEventCategory | null;
  id: string;
  mainVoteId: string | null;
  orderGroup: number | null;
  orderValue: number | string;
  sort: VoteEventListSort;
  version: 2;
}

export interface ListVoteEventsOptions {
  category?: VoteEventCategory;
  cursor?: VoteEventsListCursor;
  limit: number;
  now: Date;
  sort: VoteEventListSort;
  userId?: string;
}

export interface ListUserVoteEventsOptions extends ListVoteEventsOptions {
  userId: string;
}

export interface GetVoteEventDetailOptions {
  id: string;
  now: Date;
  userId?: string;
}

export interface ParticipateInVoteEventOptions {
  category: VoteEventCategory;
  selectedOption: VoteEventSelectedOption;
  tokenAmount: number;
  userId: string;
  voteEventId: string;
}

export interface OngoingVoteEventRecord {
  category: VoteEventCategory;
  cursorCreatedAt: string;
  cursorDeadlineAt: string;
  id: string;
  isParticipated: boolean;
  optionA: string;
  optionAImageUrl: string | null;
  optionAParticipantCount: number;
  optionATokenAmount: number;
  optionB: string;
  optionBImageUrl: string | null;
  optionBParticipantCount: number;
  optionBTokenAmount: number;
  remainingSeconds: number;
  title: string;
  totalParticipantCount: number;
  totalTokenAmount: number;
}

export interface VoteEventDetailRecord extends OngoingVoteEventRecord {
  isCompleted: boolean;
  selectedOption: VoteEventSelectedOption | null;
}

export interface UserVoteEventRecord extends OngoingVoteEventRecord {
  cursorCreatedAt: string;
  isCompleted: boolean;
}

export interface VoteEventParticipationChoiceRecord {
  selectedOption: VoteEventSelectedOption;
  tokenAmount: number;
  userId: string;
}

export interface OngoingVoteEventsPage {
  hasNext: boolean;
  items: OngoingVoteEventRecord[];
  mainVote: OngoingVoteEventRecord | null;
}

export interface CompletedVoteEventsPage {
  hasNext: boolean;
  items: OngoingVoteEventRecord[];
}

export interface UserVoteEventsPage {
  hasNext: boolean;
  items: UserVoteEventRecord[];
}

export abstract class VoteEventsRepository {
  abstract create(voteEvent: VoteEvent): Promise<VoteEvent>;
  abstract findDetail(
    options: GetVoteEventDetailOptions,
  ): Promise<VoteEventDetailRecord | null>;
  abstract findParticipationChoices(
    voteEventId: string,
  ): Promise<VoteEventParticipationChoiceRecord[]>;
  abstract getSummary(): Promise<VoteEventsSummary>;
  abstract listOngoing(
    options: ListVoteEventsOptions,
  ): Promise<OngoingVoteEventsPage>;
  abstract listCompleted(
    options: ListVoteEventsOptions,
  ): Promise<CompletedVoteEventsPage>;
  abstract listCreatedByUser(
    options: ListUserVoteEventsOptions,
  ): Promise<UserVoteEventsPage>;
  abstract listParticipatedByUser(
    options: ListUserVoteEventsOptions,
  ): Promise<UserVoteEventsPage>;
  abstract participate(options: ParticipateInVoteEventOptions): Promise<void>;
}
