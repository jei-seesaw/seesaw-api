---
name: backend-patterns
description: Backend architecture patterns for database access, transactions, caching, retry boundaries, background jobs, rate limiter integration, logging, and server-side best practices for TypeScript NestJS backends.
metadata:
  origin: ECC
---

# Backend Development Patterns

Use these patterns for scalable NestJS server-side applications. Prefer the
project's existing modules, providers, DTO style, and dependencies before adding
new infrastructure.

## When to Activate

- Implementing repository, service, provider, or interceptor layers
- Optimizing database queries, N+1 fetches, indexing, or connection use
- Adding caching with a shared store or HTTP cache headers
- Setting up background jobs or async processing
- Adding retry boundaries, logging, request correlation, or rate limiter integration

## Provider and Data Access Patterns

### Repository Pattern

Nest cannot inject TypeScript interfaces at runtime. Use an abstract class or a
symbol token for repository ports.

```ts
export abstract class MarketRepository {
  abstract findMany(filters: MarketFilters): Promise<Market[]>;
  abstract findById(id: string): Promise<Market | null>;
  abstract create(data: CreateMarketDto): Promise<Market>;
  abstract update(id: string, data: UpdateMarketDto): Promise<Market>;
  abstract delete(id: string): Promise<void>;
}

@Injectable()
export class SqlMarketRepository implements MarketRepository {
  async findMany(filters: MarketFilters): Promise<Market[]> {
    // Use the project's ORM/query builder here.
    // Select only columns the API needs and apply filters in the database.
    return [];
  }

  async findById(id: string): Promise<Market | null> {
    return null;
  }

  async create(data: CreateMarketDto): Promise<Market> {
    return { id: crypto.randomUUID(), ...data };
  }

  async update(id: string, data: UpdateMarketDto): Promise<Market> {
    return { id, ...data };
  }

  async delete(id: string): Promise<void> {}
}

@Module({
  controllers: [MarketsController],
  providers: [
    MarketsService,
    { provide: MarketRepository, useClass: SqlMarketRepository },
  ],
})
export class MarketsModule {}
```

- Keep ORM-specific code behind providers that speak domain language.
- Do not add repositories for trivial single-query modules unless they remove real duplication.
- Export repository providers only when another module genuinely needs them.

### Service Layer Pattern

```ts
@Injectable()
export class MarketsService {
  constructor(private readonly markets: MarketRepository) {}

  async findOne(id: string): Promise<MarketResponseDto> {
    const market = await this.markets.findById(id);

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    return MarketResponseDto.from(market);
  }

  async search(query: string, limit = 10): Promise<MarketResponseDto[]> {
    const results = await this.markets.findMany({ query, limit });
    return results.map(MarketResponseDto.from);
  }
}
```

- Put business rules and authorization decisions in services.
- Throw Nest framework exceptions for expected client errors.
- Do not let controllers coordinate multi-step writes.

## Database Patterns

### Query Optimization

```ts
export interface MarketSummary {
  id: string;
  name: string;
  status: MarketStatus;
  volume: number;
}

@Injectable()
export class SqlMarketReader {
  constructor(private readonly db: DatabaseClient) {}

  async findActiveSummaries(limit: number): Promise<MarketSummary[]> {
    // PASS: select only the columns needed by the response.
    return this.db.market.findMany({
      select: { id: true, name: true, status: true, volume: true },
      where: { status: 'active' },
      orderBy: { volume: 'desc' },
      take: limit,
    });
  }
}
```

- Filter, sort, and paginate in the database, not in application memory.
- Select only required columns for list endpoints.
- Add indexes only for query patterns the application actually runs.

### N+1 Query Prevention

```ts
async function attachCreators(
  markets: Market[],
  users: UserRepository,
): Promise<MarketWithCreator[]> {
  const creatorIds = [...new Set(markets.map((market) => market.creatorId))];
  const creators = await users.findByIds(creatorIds);
  const creatorById = new Map(creators.map((creator) => [creator.id, creator]));

  return markets.map((market) => ({
    ...market,
    creator: creatorById.get(market.creatorId) ?? null,
  }));
}
```

- Batch related entity loads.
- Use ORM includes/joins when they return the right shape without over-fetching.
- For GraphQL, use request-scoped DataLoader-style batching instead of per-field queries.

### Transaction Boundary

```ts
export abstract class DatabaseSession {
  abstract transaction<T>(work: (tx: TransactionClient) => Promise<T>): Promise<T>;
}

export abstract class MarketWriter {
  abstract create(data: CreateMarketDto, tx: TransactionClient): Promise<Market>;
}

export abstract class PositionWriter {
  abstract create(data: CreatePositionDto, tx: TransactionClient): Promise<Position>;
}

@Injectable()
export class MarketsService {
  constructor(
    private readonly db: DatabaseSession,
    private readonly markets: MarketWriter,
    private readonly positions: PositionWriter,
  ) {}

  createWithPosition(dto: CreateMarketWithPositionDto) {
    return this.db.transaction(async (tx) => {
      const market = await this.markets.create(dto.market, tx);
      const position = await this.positions.create(
        { ...dto.position, marketId: market.id },
        tx,
      );

      return { market, position };
    });
  }
}
```

- Keep a transaction inside the service that owns the unit of work.
- Do not split one write workflow across multiple controllers.
- Pass transaction clients explicitly only where the repository implementation needs them.

## Caching Strategies

### Cache-Aside Provider

Use a shared cache store such as Redis for production APIs. In-memory caches are
only acceptable for local development or single-process, non-critical data.

```ts
export abstract class CacheStore {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string, ttlSeconds: number): Promise<void>;
  abstract del(key: string): Promise<void>;
}

@Injectable()
export class CachedMarketReader {
  constructor(
    private readonly cache: CacheStore,
    private readonly markets: MarketRepository,
  ) {}

  async findById(id: string): Promise<Market | null> {
    const key = `market:${id}`;
    const cached = await this.cache.get(key);

    if (cached) {
      return JSON.parse(cached) as Market;
    }

    const market = await this.markets.findById(id);

    if (market) {
      await this.cache.set(key, JSON.stringify(market), 300);
    }

    return market;
  }

  invalidate(id: string) {
    return this.cache.del(`market:${id}`);
  }
}
```

- Cache reads that are hot, stable, and expensive.
- Invalidate or shorten TTLs for frequently mutated resources.
- Keep cache keys deterministic and namespaced.

## Failure Handling

### Retry with Exponential Backoff

- Add a tiny shared retry helper only after there is a real second caller.
- Use exponential backoff with bounded attempts.
- Retry only idempotent remote calls or operations with explicit dedupe keys.
- Do not retry validation errors, auth failures, or known permanent errors.

## Rate Limiter Integration

Rate limiting must use a shared store, gateway, load balancer, or platform-native
limiter. Do not use per-process in-memory counters for production APIs: they
reset on deploy, split across replicas, and fail open in serverless or
multi-instance environments.

```ts
export abstract class RateLimiter {
  abstract consume(key: string, limit: number, windowSeconds: number): Promise<boolean>;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly limiter: RateLimiter) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.ip ?? 'unknown';
    const allowed = await this.limiter.consume(key, 60, 60);

    if (!allowed) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
```

- Keep abuse controls close to public endpoints.
- Return a consistent error shape through the global exception filter.

## Background Jobs and Queues

Use a real queue or platform job system for production work. A process-local
array queue is only a demo and should not back API behavior.

```ts
export abstract class JobPublisher {
  abstract publish<TPayload>(name: string, payload: TPayload): Promise<void>;
}

@Controller('markets')
export class MarketsController {
  constructor(private readonly jobs: JobPublisher) {}

  @Post(':id/reindex')
  @HttpCode(HttpStatus.ACCEPTED)
  async reindex(@Param('id', ParseUUIDPipe) id: string) {
    await this.jobs.publish('market.reindex', { marketId: id });
    return { queued: true };
  }
}

@Injectable()
export class MarketReindexWorker {
  constructor(private readonly indexer: MarketIndexer) {}

  handle(job: { marketId: string }) {
    return this.indexer.reindex(job.marketId);
  }
}
```

- Return `202 Accepted` when work is queued instead of completed.
- Make handlers idempotent so retries are safe.
- Keep job producers in API modules and job consumers in worker modules.

## Logging and Monitoring

### Request Logging Interceptor

```ts
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const startedAt = Date.now();
    const requestId = request.headers['x-request-id'] ?? crypto.randomUUID();

    return next.handle().pipe(
      tap(() => {
        this.logger.log({
          requestId,
          method: request.method,
          path: request.url,
          durationMs: Date.now() - startedAt,
        });
      }),
    );
  }
}
```

- Log structured fields: request id, user id when available, method, path,
  status, duration, and domain identifiers.
- Do not log secrets, tokens, password hashes, or full PII payloads.
- Add health checks for database, cache, queue, and critical external clients.

**Remember**: Choose patterns that fit the current complexity. Add a provider,
cache, queue, or abstraction only when it removes real duplication or protects a
real runtime boundary.
