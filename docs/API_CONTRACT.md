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
  stable public codes, for example `UserNotFoundException`.
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
- Swagger is disabled when `APP_ENV=live`, so `/docs` and `/docs-json` should
  not be exposed in live.

## Health endpoint

`GET /health` returns the controller payload:

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

## User endpoints

`POST /api/v1/users` creates a user and returns `201 Created`.

Request:

```json
{
  "email": "alice@example.com",
  "name": "Alice"
}
```

Public response:

```json
{
  "data": {
    "id": "3a7d8f5d-5c0e-41d6-b0f5-226fcbdca7da",
    "email": "alice@example.com",
    "name": "Alice",
    "createdAt": "2026-06-30T02:45:19.000Z"
  }
}
```

`GET /api/v1/users/:id` returns the same public user shape. Missing users return
`404` with:

```json
{
  "error": {
    "code": "user_not_found",
    "message": "User not found"
  }
}
```
