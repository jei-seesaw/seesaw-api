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
