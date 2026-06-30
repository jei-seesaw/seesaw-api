---
name: api-design
description: Use for Seesaw API HTTP contract work: routes, methods, status codes, success/error envelopes, pagination, filtering, sorting, and Swagger/OpenAPI metadata. Do not use for Nest module wiring or persistence internals.
metadata:
  origin: ECC
---

# API Design Patterns

Use this skill for the HTTP contract only. Use `nestjs-patterns` for Nest
module/controller/provider mechanics and `backend-patterns` for persistence,
caching, jobs, logging, and other server internals.

In this repo, current response behavior is documented in
`docs/API_CONTRACT.md`: controllers return payloads directly, successful
responses are wrapped globally as `{ data: ... }`, and errors use
`{ error: { code, message, details? } }`.

## Resource Design

### URL Structure

```text
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

GET    /api/v1/users/:id/orders
POST   /api/v1/users/:id/orders

POST   /api/v1/orders/:id/cancel
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
```

- Use nouns, plural names, lowercase, and kebab-case.
- Use nested resources for ownership or containment.
- Use action routes sparingly when the operation is not CRUD.

```text
GOOD /api/v1/team-members
GOOD /api/v1/orders?status=active
GOOD /api/v1/users/123/orders

BAD  /api/v1/getUsers
BAD  /api/v1/user
BAD  /api/v1/team_members
BAD  /api/v1/users/123/getOrders
```

## HTTP Methods and Status Codes

| Method | Safe | Idempotent | Use for |
| --- | --- | --- | --- |
| `GET` | Yes | Yes | Retrieve resources |
| `POST` | No | No | Create resources or trigger actions |
| `PUT` | No | Yes | Full replacement |
| `PATCH` | No | Usually no | Partial update |
| `DELETE` | No | Yes | Remove resources |

Use semantic status codes:

```text
200 OK                    GET, PUT, PATCH with response body
201 Created               POST that creates a resource; include Location
202 Accepted              Job queued or async processing started
204 No Content            DELETE or update with no response body
400 Bad Request           Malformed JSON or invalid query syntax
401 Unauthorized          Missing or invalid authentication
403 Forbidden             Authenticated but not allowed
404 Not Found             Resource does not exist or is hidden
409 Conflict              Duplicate entry or state conflict
422 Unprocessable Entity  Valid JSON with semantic validation errors
429 Too Many Requests     Rate limit exceeded
500 Internal Server Error Unexpected failure; never expose internals
503 Service Unavailable   Temporary overload; include Retry-After when useful
```

- Do not return `200` with `{ success: false }` for failures.
- Do not return `500` for validation, auth, or authorization failures.
- Return `201` plus `Location` when a create endpoint exposes the new resource URL.

## Response Format

Choose one shape per API surface and keep it consistent. Seesaw API currently
uses a global success wrapper that exposes `{ data: payload }`. Do not introduce
top-level `meta` or `links` without changing `ApiResponseInterceptor` and
`docs/API_CONTRACT.md` in the same work.

### Public API Envelope

```json
{
  "data": {
    "id": "abc-123",
    "email": "alice@example.com",
    "name": "Alice",
    "createdAt": "2026-06-29T10:30:00Z"
  }
}
```

Future paginated APIs may need a wider envelope:

```json
{
  "data": [
    { "id": "abc-123", "name": "Alice" },
    { "id": "def-456", "name": "Bob" }
  ],
  "meta": {
    "total": 142,
    "page": 1,
    "perPage": 20,
    "totalPages": 8
  },
  "links": {
    "self": "/api/v1/users?page=1&perPage=20",
    "next": "/api/v1/users?page=2&perPage=20",
    "last": "/api/v1/users?page=8&perPage=20"
  }
}
```

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address",
        "code": "invalid_format"
      }
    ]
  }
}
```

- Use `camelCase` JSON fields unless the existing API already chose another convention.
- Do not expose stack traces, SQL errors, password hashes, tokens, or audit internals.
- For internal APIs, returning the resource directly is acceptable if errors still use a standard shape.

## Pagination

Use offset pagination for small admin/search surfaces. Use cursor pagination for
feeds, infinite scroll, large datasets, and public APIs.

```text
GET /api/v1/users?page=2&perPage=20
GET /api/v1/users?cursor=eyJpZCI6MTIzfQ&limit=20
```

Cursor response:

```json
{
  "data": [],
  "meta": {
    "hasNext": true,
    "nextCursor": "eyJpZCI6MTQzfQ"
  }
}
```

- Fetch one extra row to determine `hasNext`.
- Keep cursors opaque; clients should not parse them.
- Cap `limit` and `perPage` at the DTO boundary.

## Filtering, Sorting, and Search

```text
GET /api/v1/orders?status=active&customerId=abc-123
GET /api/v1/products?price[gte]=10&price[lte]=100
GET /api/v1/products?category=electronics,clothing
GET /api/v1/products?sort=-featured,price,-createdAt
GET /api/v1/products?q=wireless+headphones
GET /api/v1/users?fields=id,name,email
```

- Use query params for filters, sorting, pagination, and sparse fields.
- Prefix sort fields with `-` for descending.
- Allow only whitelisted filter and sort fields.
- Keep full-text search under `q` unless the existing API has a different convention.

NestJS query DTO example:

```ts
export class ListUsersQueryDto {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit = 20;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Matches(/^-?(createdAt|name|email)$/)
  sort = '-createdAt';
}
```

## NestJS Endpoint Contract Example

```ts
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(
    @Body() dto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto);
    response.status(HttpStatus.CREATED);
    response.setHeader('Location', `/api/v1/users/${user.id}`);

    return UserResponseDto.from(user);
  }

  @Get()
  findMany(@Query() query: ListUsersQueryDto) {
    return this.usersService.findMany(query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
```

- Set status with `@HttpCode()` when it is static.
- Use passthrough response only when headers or dynamic status are needed.
- Keep DTO validation in Nest pipes; return response DTOs directly and let the
  global interceptor apply the success envelope.

## Authentication and Authorization Contract

```text
Authorization: Bearer <token>
X-API-Key: <server-to-server-key>
```

- Return `401` when credentials are missing or invalid.
- Return `403` when credentials are valid but insufficient.
- Keep ownership checks resource-specific; do not reveal hidden resources when policy says to return `404`.

## Rate Limiting Contract

```text
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1782720000
Retry-After: 60
```

When exceeded:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Try again in 60 seconds."
  }
}
```

- Return `429 Too Many Requests`.
- Include `Retry-After` when the client can safely retry later.
- Define tiers by principal: anonymous IP, authenticated user, API key, or internal service.

## Versioning

Prefer URL path versioning for APIs that clients call directly:

```text
/api/v1/users
/api/v2/users
```

- Start with `/api/v1`; do not add a new version until there is a breaking change.
- Maintain at most current plus previous for public APIs unless policy says otherwise.
- Additive response fields, optional query params, and new endpoints are non-breaking.
- Removed fields, renamed fields, changed types, auth changes, and URL changes are breaking.
- For public API deprecation, announce a timeline and add `Sunset` before removal.

## Checklist

- Resource URL is plural, kebab-case, and avoids verbs except action routes.
- Method and status code match HTTP semantics.
- Create endpoint returns `201` and `Location` when the new resource is addressable.
- List endpoint has bounded pagination.
- Filters and sort fields are allowlisted.
- Error response uses a stable `code` and human-readable `message`.
- Auth requirement is explicit: public, bearer token, API key, or internal only.
- Authorization behavior is defined for ownership and role failures.
- Rate limit headers and `429` body are consistent.
- Response fields do not leak internal data.
- OpenAPI/Swagger docs match the implemented contract.
