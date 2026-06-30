import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger, type LogFields } from './app-logger.service';

interface RequestLogRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
}

interface RequestLogResponse {
  statusCode?: number;
}

@Injectable()
export class RequestLoggingInterceptor
  implements NestInterceptor<unknown, unknown>
{
  constructor(private readonly logger: AppLogger) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestLogRequest>();
    const response = http.getResponse<RequestLogResponse>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.logEvent(
            'http_request',
            getRequestFields(
              request,
              response.statusCode ?? HttpStatus.OK,
              startedAt,
            ),
            RequestLoggingInterceptor.name,
          );
        },
        error: (exception: unknown) => {
          this.logger.warnEvent(
            'http_request_failed',
            getRequestFields(request, getErrorStatus(exception), startedAt),
            RequestLoggingInterceptor.name,
          );
        },
      }),
    );
  }
}

function getRequestFields(
  request: RequestLogRequest,
  statusCode: number,
  startedAt: number,
): LogFields {
  return {
    method: request.method ?? 'UNKNOWN',
    path: request.originalUrl ?? request.url ?? 'unknown',
    statusCode,
    durationMs: Date.now() - startedAt,
  };
}

function getErrorStatus(exception: unknown): number {
  return exception instanceof HttpException
    ? exception.getStatus()
    : HttpStatus.INTERNAL_SERVER_ERROR;
}
