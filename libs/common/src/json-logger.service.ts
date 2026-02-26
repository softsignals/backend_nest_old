import { Injectable, LoggerService } from '@nestjs/common';
import { getRequestId } from './request-context';

interface LogPayload {
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'debug' | 'verbose';
  message: string;
  context?: string;
  requestId?: string;
  trace?: string;
  [key: string]: unknown;
}

@Injectable()
export class JsonLoggerService implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(
    level: LogPayload['level'],
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message: this.serializeMessage(message),
      context,
      requestId: getRequestId(),
      ...(trace ? { trace } : {}),
      ...this.extractMeta(message),
    };

    const line = JSON.stringify(payload);
    if (level === 'error') {
      process.stderr.write(`${line}\n`);
      return;
    }
    process.stdout.write(`${line}\n`);
  }

  private serializeMessage(message: unknown): string {
    if (message instanceof Error) {
      return message.message;
    }
    if (typeof message === 'string') {
      return message;
    }
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  private extractMeta(message: unknown): Record<string, unknown> {
    if (message instanceof Error) {
      return { stack: message.stack };
    }
    if (message && typeof message === 'object' && !Array.isArray(message)) {
      return message as Record<string, unknown>;
    }
    return {};
  }
}
