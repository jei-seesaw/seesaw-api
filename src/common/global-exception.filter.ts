import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { ApiErrorResponse } from './api-response';
import { AppLogger } from './logging/app-logger.service';

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

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: AppLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const { httpAdapter } = this.httpAdapterHost;
    const { body, status } = buildErrorResponse(exception);

    if (shouldLogException(exception, status)) {
      const request = ctx.getRequest<ErrorLogRequest>();

      this.logger.errorEvent(
        'unhandled_exception',
        exception,
        {
          method: request.method ?? 'UNKNOWN',
          path: request.originalUrl ?? request.url ?? 'unknown',
          statusCode: status,
        },
        GlobalExceptionFilter.name,
      );
    }

    httpAdapter.reply(ctx.getResponse(), body, status);
  }
}

interface ErrorLogRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
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

  if (isRecord(response) && typeof response.code === 'string') {
    return response.code;
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

function shouldLogException(exception: unknown, status: number): boolean {
  return !(exception instanceof HttpException) || status >= 500;
}
