export interface CreateVoteEventEnvelope {
  data: {
    id: string;
  };
}

export interface VoteEventRow {
  category: string;
  created_at: string;
  deadline_at: string;
  option_a: string;
  option_a_image_url: string | null;
  option_a_participant_count: number;
  option_a_token_amount: number;
  option_b: string;
  option_b_image_url: string | null;
  option_b_participant_count: number;
  option_b_token_amount: number;
  title: string;
  total_participant_count: number;
  total_token_amount: number;
}

export interface VoteEventAggregate {
  optionAParticipantCount: number;
  optionATokenAmount: number;
  optionBParticipantCount: number;
  optionBTokenAmount: number;
  totalParticipantCount: number;
  totalTokenAmount: number;
}

export interface VoteEventAggregateRow {
  option_a_participant_count: number;
  option_a_token_amount: number;
  option_b_participant_count: number;
  option_b_token_amount: number;
  total_participant_count: number;
  total_token_amount: number;
}

export interface ParticipationRow {
  selected_option: 'A' | 'B';
  token_amount: number;
}

export interface UserVoteTokenRow {
  vote_token: number;
}

export interface LoginEnvelope {
  data: {
    accessToken: string;
  };
}

export interface ErrorEnvelope {
  error: {
    code: string;
  };
}

export interface ListVoteEventsEnvelope {
  data: {
    mainVote: VoteEventListItem | null;
    otherVoteEvents: VoteEventListItem[];
    pageInfo: {
      hasNext: boolean;
      nextCursor: string | null;
    };
  };
}

export interface ListCompletedVoteEventsEnvelope {
  data: {
    pageInfo: {
      hasNext: boolean;
      nextCursor: string | null;
    };
    voteEvents: VoteEventListItem[];
  };
}

export interface VoteEventListItem {
  categoryName: string;
  id: string;
  isParticipated: boolean;
  optionA: string;
  optionAImageUrl: string | null;
  optionARatio: number | null;
  optionB: string;
  optionBImageUrl: string | null;
  optionBRatio: number | null;
  remainingTime: string;
  title: string;
  totalParticipantCount: number;
  totalTokenAmount: number | null;
}

export interface VoteEventDetailEnvelope {
  data: {
    affiliationStats: Array<{
      affiliationCode: string;
      affiliationName: string;
      optionARatio: number;
      optionBRatio: number;
    }> | null;
    categoryName: string;
    isParticipated: boolean;
    optionA: string;
    optionAImageUrl: string | null;
    optionAResultAmount: number | null;
    optionARatio: number | null;
    optionB: string;
    optionBImageUrl: string | null;
    optionBResultAmount: number | null;
    optionBRatio: number | null;
    remainingTime: string | null;
    selectedOption: 'A' | 'B' | null;
    title: string;
    totalParticipantCount: number;
    totalTokenAmount: number | null;
  };
}
