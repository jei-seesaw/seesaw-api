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

## User endpoints

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
