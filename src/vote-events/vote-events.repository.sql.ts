import { raw } from '@mikro-orm/core';
import type { VoteEventCategory } from './dto/create-vote-event.dto';
import type { VoteEventSelectedOption } from './dto/vote-event-detail.dto';
import type {
  GetVoteEventDetailOptions,
  OngoingVoteEventRecord,
  UserVoteEventRecord,
  VoteEventDetailRecord,
} from './vote-events.repository';

export interface VoteEventsSummaryRow {
  completedVoteEventCount: number | string;
  ongoingVoteEventCount: number | string;
  participantCount: number | string;
}

export interface OngoingVoteEventRow {
  category: VoteEventCategory;
  cursorCreatedAt: string;
  cursorDeadlineAt: string;
  id: string;
  isParticipated: boolean | number | string;
  optionA: string;
  optionAImageUrl: string | null;
  optionAParticipantCount: number | string;
  optionATokenAmount: number | string;
  optionB: string;
  optionBImageUrl: string | null;
  optionBParticipantCount: number | string;
  optionBTokenAmount: number | string;
  remainingSeconds: number | string;
  title: string;
  totalParticipantCount: number | string;
  totalTokenAmount: number | string;
}

export interface VoteEventDetailRow extends OngoingVoteEventRow {
  bettingResultConfirmedAt: string | null;
  bettingResultOption: VoteEventSelectedOption | null;
  bettingRewardClaimedAt: string | null;
  isCompleted: boolean | number | string;
  isOrganizer: boolean | number | string;
  myTokenAmount: number | string | null;
  selectedOption: VoteEventSelectedOption | null;
}

export interface UserVoteEventRow extends OngoingVoteEventRow {
  isCompleted: boolean | number | string;
}

export interface VoteEventParticipationChoiceRow {
  createdAt: Date | string;
  id: string;
  selectedOption: VoteEventSelectedOption;
  tokenAmount: number | string;
  userId: string;
}

export function voteEventDetailSelect(userId: string | undefined): string {
  const isParticipated = userId
    ? 'case when current_vep.`id` is null then 0 else 1 end'
    : '0';
  const isOrganizer = userId
    ? 'case when ve.`organizer_user_id` = ? then 1 else 0 end'
    : '0';
  const bettingRewardClaimedAt = userId
    ? "date_format(current_vep.`betting_reward_claimed_at`, '%Y-%m-%dT%H:%i:%s.000Z')"
    : 'null';
  const myTokenAmount = userId ? 'current_vep.`token_amount`' : 'null';
  const selectedOption = userId ? 'current_vep.`selected_option`' : 'null';

  return [
    ...voteEventBaseSelect(),
    `case when ${completedCondition()} then 1 else 0 end as \`isCompleted\``,
    remainingSecondsSelect(),
    `${isParticipated} as \`isParticipated\``,
    `${isOrganizer} as \`isOrganizer\``,
    `${myTokenAmount} as \`myTokenAmount\``,
    `${selectedOption} as \`selectedOption\``,
    've.`betting_result_option` as `bettingResultOption`',
    "date_format(ve.`betting_result_confirmed_at`, '%Y-%m-%dT%H:%i:%s.000Z') as `bettingResultConfirmedAt`",
    `${bettingRewardClaimedAt} as \`bettingRewardClaimedAt\``,
  ].join(', ');
}

export function voteEventDetailJoin(userId: string | undefined): string {
  return userId
    ? 'left join `vote_event_participations` current_vep on current_vep.`vote_event_id` = ve.`id` and current_vep.`user_id` = ?'
    : '';
}

export function voteEventDetailParams(
  options: GetVoteEventDetailOptions,
): unknown[] {
  return options.userId
    ? [options.now, options.now, options.userId, options.userId, options.id]
    : [options.now, options.now, options.id];
}

export function voteEventListSelect(userId: string | undefined): string {
  const isParticipated = userId
    ? 'case when exists (select 1 from `vote_event_participations` vep where vep.`vote_event_id` = ve.`id` and vep.`user_id` = ?) then 1 else 0 end'
    : '0';

  return [
    ...voteEventBaseSelect(),
    remainingSecondsSelect(),
    `${isParticipated} as \`isParticipated\``,
  ].join(', ');
}

export function voteEventListParams(
  userId: string | undefined,
  now: Date,
): unknown[] {
  return userId ? [now, userId, now] : [now, now];
}

export function userVoteEventListSelect(): string {
  const isParticipated =
    'case when exists (select 1 from `vote_event_participations` vep where vep.`vote_event_id` = ve.`id` and vep.`user_id` = ?) then 1 else 0 end';

  return [
    ...voteEventBaseSelect(),
    remainingSecondsSelect(),
    `${isParticipated} as \`isParticipated\``,
    `case when ${completedCondition()} then 1 else 0 end as \`isCompleted\``,
  ].join(', ');
}

export function userVoteEventListParams(
  userId: string,
  now: Date,
): unknown[] {
  return [now, userId, now];
}

export function toOngoingVoteEventRecord(
  row: OngoingVoteEventRow,
): OngoingVoteEventRecord {
  return {
    category: row.category,
    cursorCreatedAt: row.cursorCreatedAt,
    cursorDeadlineAt: row.cursorDeadlineAt,
    id: row.id,
    isParticipated: row.isParticipated === true || Number(row.isParticipated) === 1,
    optionA: row.optionA,
    optionAImageUrl: row.optionAImageUrl,
    optionAParticipantCount: Number(row.optionAParticipantCount),
    optionATokenAmount: Number(row.optionATokenAmount),
    optionB: row.optionB,
    optionBImageUrl: row.optionBImageUrl,
    optionBParticipantCount: Number(row.optionBParticipantCount),
    optionBTokenAmount: Number(row.optionBTokenAmount),
    remainingSeconds: Number(row.remainingSeconds),
    title: row.title,
    totalParticipantCount: Number(row.totalParticipantCount),
    totalTokenAmount: Number(row.totalTokenAmount),
  };
}

export function toVoteEventDetailRecord(
  row: VoteEventDetailRow,
): VoteEventDetailRecord {
  return {
    ...toOngoingVoteEventRecord(row),
    bettingResultConfirmedAt: row.bettingResultConfirmedAt,
    bettingResultOption: row.bettingResultOption,
    bettingRewardClaimedAt: row.bettingRewardClaimedAt,
    isCompleted: row.isCompleted === true || Number(row.isCompleted) === 1,
    isOrganizer: row.isOrganizer === true || Number(row.isOrganizer) === 1,
    myTokenAmount:
      row.myTokenAmount === null ? null : Number(row.myTokenAmount),
    selectedOption: row.selectedOption,
  };
}

export function toUserVoteEventRecord(
  row: UserVoteEventRow,
): UserVoteEventRecord {
  return {
    ...toOngoingVoteEventRecord(row),
    cursorCreatedAt: row.cursorCreatedAt,
    isCompleted: row.isCompleted === true || Number(row.isCompleted) === 1,
  };
}

export function voteEventAggregateUpdate(
  selectedOption: VoteEventSelectedOption,
  tokenAmount: number,
) {
  const common = {
    totalParticipantCount: raw('`total_participant_count` + 1'),
    totalTokenAmount: raw<number>('`total_token_amount` + ?', [tokenAmount]),
  };

  return selectedOption === 'A'
    ? {
        ...common,
        optionAParticipantCount: raw<number>(
          '`option_a_participant_count` + 1',
        ),
        optionATokenAmount: raw<number>(
          '`option_a_token_amount` + ?',
          [tokenAmount],
        ),
      }
    : {
        ...common,
        optionBParticipantCount: raw<number>(
          '`option_b_participant_count` + 1',
        ),
        optionBTokenAmount: raw<number>(
          '`option_b_token_amount` + ?',
          [tokenAmount],
        ),
      };
}

export function isDuplicateKeyError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return (
    error.code === 'ER_DUP_ENTRY' ||
    error.errno === 1062 ||
    isDuplicateKeyError(error.cause) ||
    isDuplicateKeyError(error.driverError)
  );
}

function voteEventBaseSelect(): string[] {
  return [
    've.`id` as `id`',
    've.`category` as `category`',
    've.`title` as `title`',
    've.`option_a` as `optionA`',
    've.`option_b` as `optionB`',
    've.`option_a_image_url` as `optionAImageUrl`',
    've.`option_b_image_url` as `optionBImageUrl`',
    've.`option_a_participant_count` as `optionAParticipantCount`',
    've.`option_b_participant_count` as `optionBParticipantCount`',
    've.`option_a_token_amount` as `optionATokenAmount`',
    've.`option_b_token_amount` as `optionBTokenAmount`',
    've.`total_participant_count` as `totalParticipantCount`',
    've.`total_token_amount` as `totalTokenAmount`',
    "date_format(ve.`created_at`, '%Y-%m-%d %H:%i:%s') as `cursorCreatedAt`",
    "date_format(ve.`deadline_at`, '%Y-%m-%d %H:%i:%s') as `cursorDeadlineAt`",
  ];
}

export function completedCondition(): string {
  return 've.`deadline_at` <= ? or ve.`betting_result_confirmed_at` is not null';
}

export function ongoingCondition(): string {
  return 've.`deadline_at` > ? and ve.`betting_result_confirmed_at` is null';
}

function remainingSecondsSelect(): string {
  return 'case when ve.`betting_result_confirmed_at` is not null then 0 else greatest(timestampdiff(second, ?, ve.`deadline_at`), 0) end as `remainingSeconds`';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
