import { getSchemaPath } from '@nestjs/swagger';
import { CreateVoteEventResponseDto } from './dto/create-vote-event.dto';
import { VoteEventDetailResponseDto } from './dto/vote-event-detail.dto';
import {
  ListCompletedVoteEventsResponseDto,
  ListVoteEventsResponseDto,
} from './dto/list-vote-events.dto';

export const createVoteEventResponseSchema = {
  example: {
    data: {
      id: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
    },
  },
  properties: {
    data: {
      $ref: getSchemaPath(CreateVoteEventResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export const castVoteResponseSchema = {
  example: {
    data: null,
  },
  properties: {
    data: {
      nullable: true,
      type: 'object' as const,
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export const listVoteEventsResponseSchema = {
  example: {
    data: {
      mainVote: {
        categoryName: '배팅',
        id: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
        isParticipated: true,
        optionA: '김치찌개',
        optionAImageUrl: null,
        optionARatio: 25,
        optionB: '돈까스',
        optionBImageUrl: 'https://example.com/b.jpg',
        optionBRatio: 75,
        remainingTime: '12:34:56',
        title: '점심 메뉴는?',
        totalParticipantCount: 120,
        totalTokenAmount: 1000,
      },
      otherVoteEvents: [],
      pageInfo: {
        hasNext: false,
        nextCursor: null,
      },
    },
  },
  properties: {
    data: {
      $ref: getSchemaPath(ListVoteEventsResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export const listCompletedVoteEventsResponseSchema = {
  example: {
    data: {
      pageInfo: {
        hasNext: false,
        nextCursor: null,
      },
      voteEvents: [
        {
          categoryName: '배팅',
          id: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
          isParticipated: false,
          optionA: '김치찌개',
          optionAImageUrl: null,
          optionARatio: 25,
          optionB: '돈까스',
          optionBImageUrl: 'https://example.com/b.jpg',
          optionBRatio: 75,
          remainingTime: '00:00:00',
          title: '점심 메뉴는?',
          totalParticipantCount: 120,
          totalTokenAmount: 1000,
        },
      ],
    },
  },
  properties: {
    data: {
      $ref: getSchemaPath(ListCompletedVoteEventsResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export const listMyVoteEventsResponseSchema = {
  example: {
    data: {
      pageInfo: {
        hasNext: false,
        nextCursor: null,
      },
      voteEvents: [
        {
          categoryName: '일상',
          id: '8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90',
          isParticipated: false,
          optionA: '김치찌개',
          optionAImageUrl: null,
          optionARatio: null,
          optionB: '돈까스',
          optionBImageUrl: 'https://example.com/b.jpg',
          optionBRatio: null,
          remainingTime: '12:34:56',
          title: '점심 메뉴는?',
          totalParticipantCount: 120,
          totalTokenAmount: null,
        },
      ],
    },
  },
  properties: {
    data: {
      $ref: getSchemaPath(ListCompletedVoteEventsResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};

export const voteEventDetailResponseSchema = {
  example: {
    data: {
      affiliationStats: [
        {
          affiliationCode: 'education',
          affiliationName: '재능교육',
          optionARatio: 75,
          optionBRatio: 25,
        },
      ],
      categoryName: '배팅',
      isParticipated: true,
      optionA: '김치찌개',
      optionAImageUrl: null,
      optionAResultAmount: 40,
      optionARatio: 40,
      optionB: '돈까스',
      optionBImageUrl: 'https://example.com/b.jpg',
      optionBResultAmount: 60,
      optionBRatio: 60,
      remainingTime: '12:34:56',
      selectedOption: 'B',
      title: '점심 메뉴는?',
      totalParticipantCount: 3,
      totalTokenAmount: 100,
    },
  },
  properties: {
    data: {
      $ref: getSchemaPath(VoteEventDetailResponseDto),
    },
  },
  required: ['data'],
  type: 'object' as const,
};
