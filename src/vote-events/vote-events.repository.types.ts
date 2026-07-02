import type { VoteEventCategory } from './dto/create-vote-event.dto';
import type { VoteEventSelectedOption } from './dto/vote-event-detail.dto';
import type { VoteEvent } from './vote-event.entity';

export interface VoteEventsSummary {
  completedVoteEventCount: number;
  ongoingVoteEventCount: number;
  participantCount: number;
}

export interface VoteEventsListCursor {
  deadlineAt: string;
  id: string;
  mainVoteId: string | null;
}

export interface ListVoteEventsOptions {
  cursor?: VoteEventsListCursor;
  limit: number;
  now: Date;
  userId?: string;
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
  abstract participate(options: ParticipateInVoteEventOptions): Promise<void>;
}
