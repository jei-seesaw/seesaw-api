# API Contract

이 문서는 현재 Seesaw API가 유지해야 하는 HTTP contract만 담는다.

## Success response

Controllers return the resource payload directly.

```ts
return { status: 'ok' };
```

The global `ApiResponseInterceptor` wraps successful responses:

```json
{
  "data": {
    "status": "ok"
  }
}
```

Do not return `{ data: ... }` from controllers unless the global interceptor is
changed first. That would double-wrap the response.

## Error response

`GlobalExceptionFilter` owns the public error envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": []
  }
}
```

- Expected Nest `HttpException` values keep their HTTP status.
- Expected domain 4xx errors use Nest `HttpException` subclasses when they need
  stable public codes.
- Domain exception response objects with `code`, `message`, and optional
  `details` are mapped into the public error envelope.
- validation-style bad requests use `validation_error`.
- server errors, 5xx `HttpException` values, and non-HTTP exceptions return
  `internal_server_error` with `Internal server error`.
- stack traces, SQL errors, secrets, tokens, and internal audit fields must not
  appear in API responses.

## Swagger

- App-level Swagger setup lives in `src/config/swagger.ts`.
- Controller-specific decorators live beside each controller in `*.swagger.ts`.
- Swagger is available in `local` and `dev`.
- Swagger is served under `/api/v2/docs` and `/api/v2/docs-json` in `local` and
  `dev`.
- Swagger is disabled when `APP_ENV=live`, so Swagger endpoints should not be
  exposed in live.
- Swagger summary, description, example은 한국어로 작성하고 API마다 실제 사용
  흐름에 맞는 예시를 둔다.
- Swagger에는 bearer auth와 `refreshToken` cookie auth scheme을 노출한다.

## Health endpoint

`GET /api/v2/health` returns the controller payload:

```json
{
  "status": "ok"
}
```

The public response is wrapped by the global interceptor:

```json
{
  "data": {
    "status": "ok"
  }
}
```

## Home endpoint

`GET /api/v2/home`은 메인페이지에 필요한 공개 집계를 반환한다. 로그인하지
않아도 접근할 수 있다.

요청:

```text
GET /api/v2/home
```

공개 응답:

```json
{
  "data": {
    "ongoingVoteEventCount": 8,
    "completedVoteEventCount": 4,
    "participantCount": 128,
    "isLoggedIn": false
  }
}
```

유효한 bearer `accessToken`을 함께 보내면 현재 사용자의 `voteToken`도 반환한다.

```text
Authorization: Bearer jwt-access-token
```

```json
{
  "data": {
    "ongoingVoteEventCount": 8,
    "completedVoteEventCount": 4,
    "participantCount": 128,
    "isLoggedIn": true,
    "voteToken": 1000
  }
}
```

- `ongoingVoteEventCount`는 `deadlineAt`이 현재 시각보다 뒤이고 배팅 결과가
  확정되지 않은 vote event 수다.
- `completedVoteEventCount`는 `deadlineAt`이 현재 시각보다 같거나 앞섰거나
  배팅 결과가 확정된 vote event 수다.
- `participantCount`는 `vote_events.total_participant_count` 합계다.
- `isLoggedIn`은 현재 요청의 로그인 여부다.
- Authorization header가 없으면 익명 요청으로 처리한다.
- Authorization header가 있지만 유효하지 않으면 `401`과
  `invalid_access_token`을 반환한다.

## Auth endpoints

`POST /api/v2/auth/login`은 닉네임과 비밀번호로 로그인한다.

요청:

```json
{
  "nickname": "someName",
  "password": "password123"
}
```

공개 응답:

```json
{
  "data": {
    "accessToken": "jwt-access-token"
  }
}
```

같은 응답은 `refreshToken`을 `HttpOnly` cookie로 설정한다.

```text
Set-Cookie: refreshToken=jwt-refresh-token; HttpOnly; Secure; SameSite=None; Path=/api/v2/auth/refresh
```

- `accessToken`은 응답 body로만 반환한다.
- `refreshToken`은 `HttpOnly` cookie로만 반환하며 응답 body에는 포함하지 않는다.
- 닉네임 또는 비밀번호가 틀리면 `401`과 `invalid_credentials`를 반환한다.
- 요청 body가 없거나 유효하지 않으면 `400`과 `validation_error`를 반환한다.

`POST /api/v2/auth/refresh`는 `refreshToken` cookie를 읽고 새 `accessToken`을
반환한다.

요청:

```text
Cookie: refreshToken=jwt-refresh-token
```

공개 응답:

```json
{
  "data": {
    "accessToken": "new-jwt-access-token"
  }
}
```

- refresh token이 없거나, 만료되었거나, 형식이 잘못되었거나, token type이
  다르면 `401`과 `invalid_refresh_token`을 반환한다.
- bearer access token 검증 실패는 `401`과 `invalid_access_token`을 반환한다.
- refresh token 저장, token rotation, logout, revoke list는 현재 contract에
  포함하지 않는다.

## Image upload endpoints

`POST /api/v2/image-uploads`는 투표 이벤트 선택지 이미지를 Cloudinary에 직접
업로드하기 위한 signed upload 값을 발급한다. bearer `accessToken`이 필요하다.
API 서버는 이미지 바이너리를 받거나 저장하지 않는다.

권장 클라이언트 흐름:

1. 이미지 파일 선택 시점에는 브라우저 로컬 미리보기만 만든다.
2. 사용자가 투표 생성 버튼을 누르면 최종 선택된 이미지마다 이 API를 호출한다.
3. 응답받은 `uploadUrl`과 `formFields`로 Cloudinary에 직접 업로드한다.
4. Cloudinary 응답의 `secure_url`을 `POST /api/v2/vote-events`의
   `optionAImageUrl` 또는 `optionBImageUrl`에 전달한다.

요청:

```text
Authorization: Bearer jwt-access-token
```

```json
{
  "purpose": "vote-event-option",
  "contentType": "image/jpeg",
  "bytes": 420000
}
```

공개 응답:

```json
{
  "data": {
    "uploadUrl": "https://api.cloudinary.com/v1_1/seesaw/image/upload",
    "formFields": {
      "api_key": "123456789012345",
      "timestamp": 1783296000,
      "public_id": "seesaw/vote-event-option/8f6d3b2a-9c4e-4f2b-8a1d-6e0f3c2b1a90",
      "signature": "b5c4c38f4d5c2e5f4c3b2a190807060504030201"
    },
    "expiresAt": "2026-07-06T00:10:00.000Z",
    "maxBytes": 2097152,
    "allowedContentTypes": ["image/jpeg", "image/webp"]
  }
}
```

- `purpose`는 현재 `vote-event-option`만 허용한다.
- `contentType`은 `image/jpeg` 또는 `image/webp`만 허용한다.
- `bytes`는 1 이상 2MB 이하 정수여야 한다.
- 클라이언트는 최종 투표 생성 시점에 선택된 이미지에 대해서만 이 API와
  Cloudinary 직접 업로드를 수행한다. 파일 재선택 중에는 Cloudinary에 업로드하지
  않는다.
- Cloudinary 이미지를 화면에 노출할 때는 `f_auto,q_auto,c_limit,w_1280` 같은
  전달 URL 변환을 사용한다.
- bearer access token이 없거나 유효하지 않으면 `401`과
  `invalid_access_token`을 반환한다.
- 요청 body가 유효하지 않으면 `400`과 `validation_error`를 반환한다.
- v1 범위에는 `media_assets` 테이블, 미사용 업로드 정리 job, 관리자 삭제 API가
  포함되지 않는다.

## User endpoints

`POST /api/v2/register`는 사용자를 생성한다. 인증 토큰은 발급하지 않는다.

Request:

```json
{
  "nickname": "someName",
  "password": "password123",
  "affiliationCode": "education"
}
```

Public response:

```json
{
  "data": {
    "id": "generated-user-id"
  }
}
```

- `nickname` must be unique.
- `password` must be 8 to 128 characters and is never returned.
- `affiliationCode` must match an existing affiliation.
- New users receive `1000` voteToken by default.
- Duplicate nicknames return `409` with `nickname_already_exists`.
- Unknown affiliation code values return `422` with `invalid_affiliation`.

`GET /api/v2/users/nickname-availability` checks whether a nickname is already
used.

Request:

```text
GET /api/v2/users/nickname-availability?nickname=someName
```

Public response:

```json
{
  "data": {
    "available": true
  }
}
```

Missing or invalid `nickname` query values return `400` with:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": []
  }
}
```

`GET /api/v2/users/nickname-suggestion` recommends a currently available
nickname. The suggestion is not reserved.

Request:

```text
GET /api/v2/users/nickname-suggestion
```

Public response:

```json
{
  "data": {
    "nickname": "용감한 호랑이"
  }
}
```

- Suggested values use the fixed `${prefix} ${suffix}` format.
- The API checks `users.nickname` before returning the suggestion.
- Signup can still race with another client; the `users.nickname` unique
  constraint and `nickname_already_exists` remain the final defense.
- If every configured nickname combination is already used, the API returns
  `409` with `nickname_suggestion_unavailable`.

## Affiliation endpoints

`GET /api/v2/affiliations` lists affiliation metadata. `code` is the stable
public identifier.

Public response:

```json
{
  "data": [
    {
      "code": "business-group",
      "name": "사업조직"
    },
    {
      "code": "e-academy",
      "name": "재능e아카데미"
    },
    {
      "code": "education",
      "name": "재능교육"
    },
    {
      "code": "broadcasting",
      "name": "재능방송"
    },
    {
      "code": "self-learning",
      "name": "재능셀프러닝"
    },
    {
      "code": "retail",
      "name": "재능유통"
    },
    {
      "code": "printing",
      "name": "재능인쇄"
    },
    {
      "code": "holdings",
      "name": "재능홀딩스"
    }
  ]
}
```

Rows are sorted by `name` ascending. Internal fields such as `createdAt` are not
returned.

## Vote event endpoints

`GET /api/v2/ongoing-vote-events`는 진행중인 투표 이벤트를 무한 스크롤용 cursor
pagination으로 조회한다. 로그인하지 않아도 접근할 수 있다.

요청:

```text
GET /api/v2/ongoing-vote-events?limit=20&sort=latest&category=daily
```

다음 페이지 요청:

```text
GET /api/v2/ongoing-vote-events?limit=20&sort=latest&category=daily&cursor=opaque-next-cursor
```

유효한 bearer `accessToken`을 함께 보내면 현재 사용자의 참여 여부와 참여한
투표의 선택지 비율을 함께 반환한다.

```text
Authorization: Bearer jwt-access-token
```

공개 응답:

```json
{
  "data": {
    "mainVote": {
      "id": "generated-vote-event-id",
      "categoryName": "배팅",
      "remainingTime": "12:34:56",
      "title": "점심 메뉴는?",
      "optionA": "김치찌개",
      "optionB": "돈까스",
      "optionAImageUrl": null,
      "optionBImageUrl": "https://example.com/b.jpg",
      "optionARatio": 25,
      "optionBRatio": 75,
      "totalParticipantCount": 120,
      "totalTokenAmount": 1000,
      "isParticipated": true
    },
    "otherVoteEvents": [],
    "pageInfo": {
      "hasNext": false,
      "nextCursor": null
    }
  }
}
```

- `sort`는 `latest`, `deadline`, `participants` 중 하나이며 기본값은
  `latest`다.
- `category`는 `betting`, `daily`, `balance`, `work` 중 하나이며 생략하면
  전체 카테고리를 조회한다. 카테고리는 응답 그룹이 아니라 DB pagination 전에
  적용되는 필터다.
- `mainVote`는 첫 페이지에서만 반환하며, 필터링된 진행중인 투표 중
  `totalParticipantCount` 내림차순, `deadlineAt` 오름차순, `id` 오름차순으로
  첫 번째 투표다. 다음 페이지에서는 `null`이다.
- `otherVoteEvents`는 `mainVote`를 제외한 진행중인 투표다.
- `otherVoteEvents` 정렬은 `latest`일 때 `createdAt` 내림차순, 같은 시각이면
  `id` 오름차순이다.
- `sort=deadline`은 마감임박순(`deadlineAt` 오름차순, `id` 오름차순)이다.
- `sort=participants`는 `totalParticipantCount` 내림차순, `id` 오름차순이다.
- `limit` 기본값은 `20`, 최댓값은 `50`이다.
- `cursor`는 opaque 문자열이며 클라이언트가 해석하지 않는다. v2 cursor는
  `sort`, `category`, 정렬 기준값, `id`, `mainVoteId`를 포함한다.
- cursor와 함께 보낸 `sort` 또는 `category`가 cursor 생성 시점의 query와
  다르면 `400`과 `invalid_cursor`를 반환한다.
- `remainingTime`은 서버 기준 남은 시간 `HH:mm:ss`다.
- 미로그인 요청 또는 참여하지 않은 투표의 `optionARatio`, `optionBRatio`는
  `null`이다.
- `optionARatio`, `optionBRatio`는 소수 퍼센트 숫자다.
- `betting` 투표의 비율은 선택지별 token amount 기준이다.
- non-betting 투표의 비율은 선택지별 participant count 기준이다.
- non-betting 투표의 `totalTokenAmount`는 `null`이다.
- Authorization header가 있지만 유효하지 않으면 `401`과
  `invalid_access_token`을 반환한다.
- `cursor`가 유효하지 않으면 `400`과 `invalid_cursor`를 반환한다.

`GET /api/v2/completed-vote-events`는 완료된 투표 이벤트를 무한 스크롤용
cursor pagination으로 조회한다. 로그인하지 않아도 접근할 수 있다.

요청:

```text
GET /api/v2/completed-vote-events?limit=20&sort=latest&category=betting
```

다음 페이지 요청:

```text
GET /api/v2/completed-vote-events?limit=20&sort=latest&category=betting&cursor=opaque-next-cursor
```

공개 응답:

```json
{
  "data": {
    "voteEvents": [
      {
        "id": "generated-vote-event-id",
        "categoryName": "배팅",
        "remainingTime": "00:00:00",
        "title": "점심 메뉴는?",
        "optionA": "김치찌개",
        "optionB": "돈까스",
        "optionAImageUrl": null,
        "optionBImageUrl": "https://example.com/b.jpg",
        "optionARatio": 25,
        "optionBRatio": 75,
        "totalParticipantCount": 120,
        "totalTokenAmount": 1000,
        "isParticipated": false
      }
    ],
    "pageInfo": {
      "hasNext": false,
      "nextCursor": null
    }
  }
}
```

- `voteEvents`는 완료된 투표다.
- `sort=latest`는 기본값이며 `createdAt` 내림차순, 같은 시각이면 `id`
  오름차순이다.
- `sort=deadline`은 최근 완료순(`deadlineAt` 내림차순, `id` 오름차순)이다.
- `sort=participants`는 `totalParticipantCount` 내림차순, `id` 오름차순이다.
- `category`는 진행중인 투표 목록과 같은 카테고리 필터다.
- `deadlineAt`이 서버 기준 현재 시각보다 같거나 앞섰거나 배팅 결과가 확정된
  투표만 반환한다.
- 완료된 투표는 결과가 공개되므로 로그인 여부나 참여 여부와 무관하게
  `optionARatio`, `optionBRatio`를 항상 반환한다.
- 유효한 bearer `accessToken`을 함께 보내면 `isParticipated`에 현재 사용자의
  참여 여부를 반환한다. 미로그인 요청에서는 `false`다.
- `remainingTime`은 완료된 투표이므로 `00:00:00`이다.
- `limit`, `cursor`, `sort`, `category`, 비율 계산, `totalTokenAmount`, 인증 오류,
  cursor 오류 규칙은 진행중인 투표 목록과 같다.

`GET /api/v2/me/created-vote-events`는 로그인한 사용자가 만든 투표 이벤트를
진행/완료 구분 없이 cursor pagination으로 조회한다. bearer `accessToken`이
필요하다.

요청:

```text
Authorization: Bearer jwt-access-token
GET /api/v2/me/created-vote-events?limit=20&sort=latest&category=work
```

다음 페이지 요청:

```text
GET /api/v2/me/created-vote-events?limit=20&sort=latest&category=work&cursor=opaque-next-cursor
```

공개 응답:

```json
{
  "data": {
    "voteEvents": [
      {
        "id": "generated-vote-event-id",
        "categoryName": "일상",
        "remainingTime": "12:34:56",
        "title": "점심 메뉴는?",
        "optionA": "김치찌개",
        "optionB": "돈까스",
        "optionAImageUrl": null,
        "optionBImageUrl": "https://example.com/b.jpg",
        "optionARatio": null,
        "optionBRatio": null,
        "totalParticipantCount": 120,
        "totalTokenAmount": null,
        "isParticipated": false
      }
    ],
    "pageInfo": {
      "hasNext": false,
      "nextCursor": null
    }
  }
}
```

`GET /api/v2/me/participated-vote-events`는 로그인한 사용자가 참여한 투표 이벤트를
진행/완료 구분 없이 cursor pagination으로 조회한다. bearer `accessToken`이
필요하다.

요청:

```text
Authorization: Bearer jwt-access-token
GET /api/v2/me/participated-vote-events?limit=20&sort=latest&category=betting
```

다음 페이지 요청:

```text
GET /api/v2/me/participated-vote-events?limit=20&sort=latest&category=betting&cursor=opaque-next-cursor
```

응답 shape은 `GET /api/v2/me/created-vote-events`와 같다.

- 두 목록 모두 `mainVote` 없이 `{ voteEvents, pageInfo }`만 반환한다.
- `sort=latest`는 기본값이며 `createdAt` 내림차순, 같은 시각이면 `id`
  오름차순이다.
- `sort=deadline`은 진행중인 투표를 마감임박순으로 먼저 반환한 뒤, 완료된
  투표를 최근 완료순으로 반환한다. 각 그룹의 같은 시각은 `id` 오름차순이다.
- `sort=participants`는 `totalParticipantCount` 내림차순, `id` 오름차순이다.
- `category`는 진행중인 투표 목록과 같은 카테고리 필터다.
- 내가 만든 목록은 `vote_events.organizer_user_id`가 현재 사용자 ID인 row만
  반환한다. 기존 row처럼 `organizer_user_id`가 `null`인 row는 포함하지 않는다.
- 내가 참여한 목록은 `vote_event_participations.user_id`가 현재 사용자 ID인
  투표만 반환한다.
- 진행중인 투표의 `optionARatio`, `optionBRatio`는 현재 사용자가 참여한 경우에만
  반환하고, 완료된 투표는 로그인/참여 여부와 무관하게 항상 반환한다.
- `limit`, `cursor`, `sort`, `category`, 비율 계산, `totalTokenAmount`, cursor 오류 규칙은
  진행중인 투표 목록과 같다.
- bearer access token이 없거나 유효하지 않으면 `401`과
  `invalid_access_token`을 반환한다.

`GET /api/v2/vote-events/:id`는 투표 상세 페이지에 필요한 정보를 조회한다.
로그인하지 않아도 접근할 수 있다.

요청:

```text
GET /api/v2/vote-events/generated-vote-event-id
```

유효한 bearer `accessToken`을 함께 보내면 현재 사용자의 참여 여부와 선택지를
함께 반환한다.

```text
Authorization: Bearer jwt-access-token
```

공개 응답:

```json
{
  "data": {
    "categoryName": "배팅",
    "title": "점심 메뉴는?",
    "totalParticipantCount": 3,
    "remainingTime": "12:34:56",
    "optionA": "김치찌개",
    "optionB": "돈까스",
    "optionAImageUrl": null,
    "optionBImageUrl": "https://example.com/b.jpg",
    "optionARatio": 40,
    "optionBRatio": 60,
    "optionAResultAmount": 40,
    "optionBResultAmount": 60,
    "affiliationStats": [
      {
        "affiliationCode": "education",
        "affiliationName": "재능교육",
        "optionARatio": 75,
        "optionBRatio": 25
      }
    ],
    "isParticipated": true,
    "isOrganizer": true,
    "selectedOption": "B",
    "totalTokenAmount": 100,
    "bettingResultOption": null,
    "bettingResultConfirmedAt": null,
    "bettingInfo": {
      "myTokenAmount": 25,
      "payoutRate": 62.5,
      "rewardClaimed": null,
      "resultConfirmed": false,
      "earnedTokenAmount": null
    },
    "canConfirmBettingResult": true
  }
}
```

- 진행중인 투표의 `remainingTime`은 서버 기준 남은 시간 `HH:mm:ss`다.
- 완료된 투표의 `remainingTime`은 `null`이다.
- 진행중인 투표에서 미로그인 요청 또는 참여하지 않은 사용자의
  `optionARatio`, `optionBRatio`, `optionAResultAmount`,
  `optionBResultAmount`, `affiliationStats`, `selectedOption`은 `null`이다.
- 완료된 투표는 결과가 공개되므로 로그인 여부나 참여 여부와 무관하게 비율,
  결과 수량, 소속별 통계를 반환한다.
- `optionAResultAmount`, `optionBResultAmount`는 non-betting 투표에서는 선택지별
  participant count이고, `betting` 투표에서는 선택지별 token amount다.
- `optionARatio`, `optionBRatio`, 소속별 비율은 `betting` 투표에서는 token amount
  기준이고 non-betting 투표에서는 participant count 기준이다.
- `affiliationStats`는 참여자가 있는 소속만 반환한다. 결과를 공개하지 않는
  요청에서는 `null`이다.
- non-betting 투표의 `totalTokenAmount`는 `null`이다.
- `isOrganizer`는 현재 사용자가 이 투표 이벤트의 주최자인지 여부다. 미로그인
  요청에서는 `false`다.
- `bettingResultOption`은 배팅 정답이 확정되면 `A` 또는 `B`이고, 미확정 또는
  non-betting 투표에서는 `null`이다.
- `bettingResultConfirmedAt`은 배팅 정답 확정 시각이다. 미확정 또는 non-betting
  투표에서는 `null`이다.
- `bettingInfo`는 `betting` 투표에서만 객체이고 non-betting 투표에서는 `null`이다.
- `bettingInfo.myTokenAmount`는 현재 사용자가 배팅한 토큰 수다. 미로그인 또는
  미참여 요청에서는 `null`이다.
- `bettingInfo.payoutRate`는 `myTokenAmount / selectedOptionTokenTotal * 100`을
  소수 둘째 자리로 반올림한 값이다. 현재 사용자가 참여하지 않았으면 `null`이다.
- `bettingInfo.resultConfirmed`는 배팅 정답 확정 여부다.
- `bettingInfo.rewardClaimed`는 미로그인, 미참여, 미확정이면 `null`이다. 승자는
  실제 수령 여부를 반환하고, 패자는 `true`를 반환한다.
- `bettingInfo.earnedTokenAmount`는 수령 API 호출 시 `users.vote_token`에 더해지는
  총 토큰 수이며 원금을 포함한다. 패자, 미확정, 미참여 요청에서는 `null`이다.
- `canConfirmBettingResult`는 현재 사용자가 주최자인 미확정 배팅 이벤트에서만
  `true`다.
- 투표 이벤트가 없으면 `404`와 `vote_event_not_found`를 반환한다.
- Authorization header가 있지만 유효하지 않으면 `401`과
  `invalid_access_token`을 반환한다.

`POST /api/v2/vote-events`는 투표 이벤트를 생성한다. bearer `accessToken`이
필요하며 현재 사용자를 내부 주최자 ID로 저장한다.

요청:

```text
Authorization: Bearer jwt-access-token
```

```json
{
  "category": "betting",
  "title": "점심 메뉴는?",
  "deadlineAt": "2026-07-06T11:00:00+09:00",
  "optionA": "김치찌개",
  "optionB": "돈까스",
  "optionAImageUrl": null,
  "optionBImageUrl": "https://example.com/b.jpg"
}
```

공개 응답:

```json
{
  "data": {
    "id": "generated-vote-event-id"
  }
}
```

- `category`는 `betting`, `daily`, `balance`, `work` 중 하나여야 한다.
- `title`, `optionA`, `optionB`는 1자 이상 120자 이하여야 한다.
- `deadlineAt`은 필수다. ISO 8601 date-time 문자열이며 `Z` 또는
  `+09:00` 같은 명시적 timezone이 있어야 한다.
- `deadlineAt`은 정각 단위여야 하며 생성 시각보다 뒤이고 생성 시각으로부터
  24시간 이하여야 한다. 예를 들어 2026-07-06 10:34에 생성하면 마지막 허용
  정각은 2026-07-07 10:00이다.
- `optionAImageUrl`, `optionBImageUrl`은 생략하거나 `null`일 수 있다. 값이
  있으면 투표 생성 시점에 Cloudinary 직접 업로드 후 받은 `secure_url`을
  전달한다. URL은 2048자 이하의 http/https URL이어야 한다.
- bearer access token이 없거나 유효하지 않으면 `401`과
  `invalid_access_token`을 반환한다.
- 마감 시각이 정각이 아니거나 허용 범위를 벗어나면 `422`와
  `invalid_vote_event_deadline`을 반환한다.
- 요청 body에는 주최자 필드를 받지 않고, 서버가 accessToken의 사용자 ID를
  `vote_events.organizer_user_id`에 저장한다.
- 참여자 수와 토큰 집계는 `0`에서 시작한다.

`POST /api/v2/vote`는 로그인한 사용자의 투표 참여를 기록한다.

일반 투표 요청:

```text
Authorization: Bearer jwt-access-token
```

```json
{
  "voteEventId": "generated-vote-event-id",
  "selectedOption": "A"
}
```

배팅 투표 요청:

```json
{
  "voteEventId": "generated-vote-event-id",
  "selectedOption": "B",
  "tokenAmount": 25
}
```

공개 응답:

```json
{
  "data": null
}
```

- `selectedOption`은 `A` 또는 `B`만 허용한다.
- 사용자는 같은 투표 이벤트에 한 번만 참여할 수 있다. 이미 참여했다면
  `409`와 `vote_event_already_participated`를 반환한다.
- 마감되었거나 배팅 결과가 확정된 투표 이벤트에는 참여할 수 없다. 닫힌
  이벤트면 `409`와 `vote_event_closed`를 반환한다.
- 투표 이벤트가 없으면 `404`와 `vote_event_not_found`를 반환한다.
- `betting` 투표는 `tokenAmount`가 필수다. 없으면 `422`와
  `token_amount_required`를 반환한다.
- non-betting 투표는 `tokenAmount`를 보내면 안 된다. 보내면 `422`와
  `token_amount_not_allowed`를 반환한다.
- `tokenAmount`는 1 이상의 정수여야 한다.
- 배팅 투표에서 보유 `voteToken`이 부족하면 `409`와
  `insufficient_vote_token`을 반환한다.
- 성공하면 참여 기록을 저장하고 `totalParticipantCount`,
  선택지별 participant count를 증가시킨다.
- 배팅 투표는 추가로 `totalTokenAmount`, 선택지별 token amount를 증가시키고,
  사용자 `voteToken`을 `tokenAmount`만큼 차감한다.

`POST /api/v2/vote-events/:id/betting-result`는 투표 이벤트 주최자가 배팅
정답만 확정한다. 토큰 지급은 보상 수령 API에서 처리한다.

요청:

```text
Authorization: Bearer jwt-access-token
```

```json
{
  "winningOption": "A"
}
```

공개 응답:

```json
{
  "data": null
}
```

- `winningOption`은 `A` 또는 `B`만 허용한다.
- bearer access token이 없거나 유효하지 않으면 `401`과
  `invalid_access_token`을 반환한다.
- 투표 이벤트가 없으면 `404`와 `vote_event_not_found`를 반환한다.
- 현재 사용자가 주최자가 아니면 `403`과 `vote_event_result_forbidden`을
  반환한다.
- 이미 확정된 배팅 이벤트면 `409`와 `vote_event_result_already_confirmed`를
  반환한다.
- 배팅 이벤트가 아니면 `422`와 `vote_event_result_not_allowed`를 반환한다.
- 배팅 결과가 확정된 이벤트는 마감 전이어도 완료된 투표로 취급하며 이후
  투표 참여를 `vote_event_closed`로 거절한다.
- 승자가 없더라도 사용자 `voteToken`을 업데이트하지 않고 결과만 확정한다.

`POST /api/v2/vote-events/:id/betting-reward/claim`은 로그인한 배팅 참여자가
확정된 배팅 결과의 보상을 직접 수령한다.

요청:

```text
Authorization: Bearer jwt-access-token
```

공개 응답:

```json
{
  "data": {
    "earnedTokenAmount": 40,
    "rewardClaimed": true
  }
}
```

- 승자는 `users.vote_token`에 원금을 포함한 지급액을 한 번만 더하고
  `vote_event_participations.betting_reward_claimed_at`을 저장한다.
- 이미 수령한 승자가 다시 호출하면 `200`으로 같은 `earnedTokenAmount`를 반환하고
  토큰을 추가 지급하지 않는다.
- 패자가 호출하면 `200`으로 `earnedTokenAmount: null`, `rewardClaimed: true`를
  반환하고 토큰을 변경하지 않는다.
- bearer access token이 없거나 유효하지 않으면 `401`과
  `invalid_access_token`을 반환한다.
- 투표 이벤트가 없으면 `404`와 `vote_event_not_found`를 반환한다.
- 현재 사용자가 해당 배팅 이벤트에 참여하지 않았으면 `403`과
  `betting_reward_forbidden`을 반환한다.
- 배팅 결과가 아직 확정되지 않았으면 `409`와
  `betting_result_not_confirmed`를 반환한다.
- 배팅 이벤트가 아니면 `422`와 `betting_reward_not_allowed`를 반환한다.
- 승자는 원금과 패자 풀을 지분 비례로 받는다.
- 승자별 지급액은 `stake + floor(losingPool * stake / winningPool)`이다.
- 나눗셈 후 남은 토큰은 소수 잔여가 큰 승자부터, 동률이면 참여 `createdAt`,
  `id` 오름차순으로 1개씩 배분한다.

## Vote event chat endpoints

각 투표 이벤트는 별도 `chat_rooms` 리소스 없이 하나의 채팅방으로 취급한다.
v1 채팅은 로그인 사용자만 접근할 수 있고, 진행/완료 투표 이벤트 모두에서
텍스트 메시지만 허용한다.

`GET /api/v2/vote-events/:id/chat-messages`는 투표 이벤트의 채팅 메시지를
cursor pagination으로 조회한다. bearer `accessToken`이 필요하다.

요청:

```text
Authorization: Bearer jwt-access-token
GET /api/v2/vote-events/generated-vote-event-id/chat-messages?limit=50
```

다음 페이지 요청:

```text
GET /api/v2/vote-events/generated-vote-event-id/chat-messages?limit=50&cursor=opaque-next-cursor
```

공개 응답:

```json
{
  "data": {
    "messages": [
      {
        "id": "message-id",
        "voteEventId": "generated-vote-event-id",
        "clientMessageId": "client-message-id",
        "user": {
          "id": "user-id",
          "nickname": "hyoseok",
          "affiliationName": "재능교육"
        },
        "content": "저는 A가 더 좋아요",
        "createdAt": "2026-07-08T12:00:00.000Z",
        "isMine": true
      }
    ],
    "pageInfo": {
      "hasNext": false,
      "nextCursor": null
    }
  }
}
```

- `limit` 기본값은 `50`, 최댓값은 `50`이다.
- cursor가 없으면 최신 메시지부터 최대 `limit`개를 고르되, 응답 배열은 오래된
  순서부터 반환한다.
- cursor가 있으면 해당 메시지보다 오래된 메시지를 조회한다.
- `cursor`는 opaque 문자열이며 클라이언트가 해석하지 않는다.
- cursor가 유효하지 않으면 `400`과 `invalid_cursor`를 반환한다.
- bearer access token이 없거나 유효하지 않으면 `401`과
  `invalid_access_token`을 반환한다.
- 투표 이벤트가 없으면 `404`와 `vote_event_not_found`를 반환한다.

Socket.IO 채팅은 namespace `/api/v2/chats`, path `/socket.io`를 사용한다.

클라이언트 연결:

```ts
io(`${API_BASE_URL}/chats`, {
  path: '/socket.io',
  auth: { accessToken },
});
```

여기서 `API_BASE_URL`은 `/api/v2`까지 포함한 값이다. 예를 들어
`https://api.example.com/api/v2`를 사용하면 Socket.IO 연결 URL은
`https://api.example.com/api/v2/chats`다.

이벤트:

```text
client -> server: chat:join
client -> server: chat:message:send
server -> client: chat:message:new
```

`chat:join` payload:

```json
{
  "voteEventId": "generated-vote-event-id"
}
```

`chat:message:send` payload:

```json
{
  "voteEventId": "generated-vote-event-id",
  "clientMessageId": "client-message-id",
  "content": "저는 A가 더 좋아요"
}
```

Socket ack shape:

```ts
type SocketAck<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

- 연결 시 `auth.accessToken`을 검증하고 실패하면 `connect_error` 메시지
  `invalid_access_token`으로 거절한다.
- room 이름은 `vote-event:{voteEventId}`다.
- `voteEventId`, `clientMessageId`는 UUID 문자열이어야 한다.
- `content`는 trim 후 1자 이상 500자 이하여야 한다.
- 메시지는 MariaDB에 저장한 뒤 같은 room에 `chat:message:new`으로 전송한다.
- 같은 사용자가 같은 `clientMessageId`를 재전송하면 기존 메시지를 성공 ack로
  반환하고 다시 전송하지 않는다.
- Redis adapter, 읽음 처리, 타이핑 상태, 메시지 수정/삭제/신고/관리 기능은 v1
  contract에 포함하지 않는다.
