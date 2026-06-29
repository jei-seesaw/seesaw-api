import { ConsoleLogger, Injectable } from '@nestjs/common';

export type LogFields = Record<string, unknown>;

@Injectable()
export class AppLogger extends ConsoleLogger {
  logEvent(event: string, fields: LogFields = {}, context?: string): void {
    this.writeLog('log', event, fields, context);
  }

  warnEvent(event: string, fields: LogFields = {}, context?: string): void {
    this.writeLog('warn', event, fields, context);
  }

  errorEvent(
    event: string,
    error: unknown,
    fields: LogFields = {},
    context?: string,
  ): void {
    const message = formatLog(event, { ...fields, ...getErrorFields(error) });
    const stack = error instanceof Error ? error.stack : undefined;

    if (context === undefined) {
      this.error(message, stack);
      return;
    }

    this.error(message, stack, context);
  }

  private writeLog(
    level: 'log' | 'warn',
    event: string,
    fields: LogFields,
    context?: string,
  ): void {
    const message = formatLog(event, fields);

    if (context === undefined) {
      this[level](message);
      return;
    }

    this[level](message, context);
  }
}

function formatLog(event: string, fields: LogFields): string {
  return JSON.stringify({ ...fields, event });
}

function getErrorFields(error: unknown): LogFields {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  return {
    errorName: 'UnknownError',
    errorMessage: typeof error === 'string' ? error : 'Non-error exception',
  };
}
