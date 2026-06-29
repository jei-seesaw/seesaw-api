import {
  ArgumentsHost,
  CallHandler,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const ERROR_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'bad_request',
  [HttpStatus.UNAUTHORIZED]: 'unauthorized',
  [HttpStatus.FORBIDDEN]: 'forbidden',
  [HttpStatus.NOT_FOUND]: 'not_found',
  [HttpStatus.CONFLICT]: 'conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'validation_error',
  [HttpStatus.TOO_MANY_REQUESTS]: 'too_many_requests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'internal_server_error',
};

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const { httpAdapter } = this.httpAdapterHost;
    const { body, status } = buildErrorResponse(exception);

    httpAdapter.reply(ctx.getResponse(), body, status);
  }
}

function buildErrorResponse(exception: unknown): {
  body: ApiErrorResponse;
  status: number;
} {
  if (!(exception instanceof HttpException)) {
    return internalServerErrorResponse();
  }

  const status: HttpStatus = exception.getStatus();

  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
    return internalServerErrorResponse(status);
  }

  const response = exception.getResponse();
  const code = getErrorCode(status, response);
  const { message, details } = getErrorMessage(response, exception.message);

  return {
    status,
    body: {
      error:
        details === undefined ? { code, message } : { code, message, details },
    },
  };
}

function internalServerErrorResponse(
  status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
): { body: ApiErrorResponse; status: number } {
  return {
    status,
    body: {
      error: {
        code: 'internal_server_error',
        message: 'Internal server error',
      },
    },
  };
}

function getErrorCode(status: HttpStatus, response: string | object): string {
  if (
    status === HttpStatus.BAD_REQUEST &&
    isRecord(response) &&
    Array.isArray(response.message)
  ) {
    return 'validation_error';
  }

  return (
    ERROR_CODES[status] ??
    (status >= HttpStatus.INTERNAL_SERVER_ERROR
      ? 'internal_server_error'
      : 'bad_request')
  );
}

function getErrorMessage(
  response: string | object,
  fallbackMessage: string,
): { message: string; details?: unknown } {
  if (typeof response === 'string') {
    return { message: response };
  }

  if (!isRecord(response)) {
    return { message: fallbackMessage };
  }

  if (Array.isArray(response.message)) {
    return {
      message: 'Request validation failed',
      details: response.message,
    };
  }

  const message =
    typeof response.message === 'string' ? response.message : fallbackMessage;

  return response.details === undefined
    ? { message }
    : { message, details: response.details };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
