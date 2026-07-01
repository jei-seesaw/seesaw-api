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

- `ongoingVoteEventCount`는 `deadlineAt`이 현재 시각보다 뒤인 vote event 수다.
- `completedVoteEventCount`는 `deadlineAt`이 현재 시각보다 같거나 앞선 vote
  event 수다.
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

## User endpoints

`POST /api/v2/register`는 사용자를 생성한다. 인증 토큰은 발급하지 않는다.

Request:

```json
{
  "nickname": "someName",
  "password": "password123",
  "affiliationCode": "teacher"
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

## Affiliation endpoints

`GET /api/v2/affiliations` lists affiliation metadata. `code` is the stable
public identifier.

Public response:

```json
{
  "data": [
    {
      "code": "headquarters",
      "name": "본사"
    },
    {
      "code": "teacher",
      "name": "선생님"
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
GET /api/v2/ongoing-vote-events?limit=20
```

다음 페이지 요청:

```text
GET /api/v2/ongoing-vote-events?limit=20&cursor=opaque-next-cursor
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

- `mainVote`는 첫 페이지에서만 반환하며, 진행중인 투표 중
  `totalParticipantCount`가 가장 큰 투표다. 다음 페이지에서는 `null`이다.
- `otherVoteEvents`는 `mainVote`를 제외한 진행중인 투표이며 마감임박순으로
  정렬한다.
- `limit` 기본값은 `20`, 최댓값은 `50`이다.
- `cursor`는 opaque 문자열이며 클라이언트가 해석하지 않는다.
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
GET /api/v2/completed-vote-events?limit=20
```

다음 페이지 요청:

```text
GET /api/v2/completed-vote-events?limit=20&cursor=opaque-next-cursor
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

- `voteEvents`는 완료된 투표이며 최근 완료순으로 정렬한다.
- `deadlineAt`이 서버 기준 현재 시각보다 같거나 앞선 투표만 반환한다.
- 완료된 투표는 결과가 공개되므로 로그인 여부나 참여 여부와 무관하게
  `optionARatio`, `optionBRatio`를 항상 반환한다.
- 유효한 bearer `accessToken`을 함께 보내면 `isParticipated`에 현재 사용자의
  참여 여부를 반환한다. 미로그인 요청에서는 `false`다.
- `remainingTime`은 완료된 투표이므로 `00:00:00`이다.
- `limit`, `cursor`, 비율 계산, `totalTokenAmount`, 인증 오류, cursor 오류
  규칙은 진행중인 투표 목록과 같다.

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
        "affiliationCode": "teacher",
        "affiliationName": "선생님",
        "optionARatio": 75,
        "optionBRatio": 25
      }
    ],
    "isParticipated": true,
    "selectedOption": "B",
    "totalTokenAmount": 100
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
- 투표 이벤트가 없으면 `404`와 `vote_event_not_found`를 반환한다.
- Authorization header가 있지만 유효하지 않으면 `401`과
  `invalid_access_token`을 반환한다.

`POST /api/v2/vote-events`는 투표 이벤트를 생성한다. bearer `accessToken`이
필요하지만 생성자를 저장하지는 않는다.

요청:

```text
Authorization: Bearer jwt-access-token
```

```json
{
  "category": "betting",
  "title": "점심 메뉴는?",
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
- `optionAImageUrl`, `optionBImageUrl`은 생략하거나 `null`일 수 있다. 값이
  있으면 2048자 이하의 http/https URL이어야 한다.
- bearer access token이 없거나 유효하지 않으면 `401`과
  `invalid_access_token`을 반환한다.
- `deadlineAt`은 생성 시각으로부터 24시간 뒤로 설정한다.
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
- 마감된 투표 이벤트에는 참여할 수 없다. 마감된 이벤트면 `409`와
  `vote_event_closed`를 반환한다.
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
