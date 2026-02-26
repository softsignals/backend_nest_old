import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { JsonLoggerService } from './json-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: JsonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const startedAt = Date.now();

    this.logger.log(
      {
        event: 'request_start',
        method: request.method,
        path: request.url,
        requestId: request.headers['x-request-id'],
      },
      LoggingInterceptor.name,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            {
              event: 'request_complete',
              method: request.method,
              path: request.url,
              statusCode: response.statusCode,
              durationMs: Date.now() - startedAt,
              requestId: request.headers['x-request-id'],
            },
            LoggingInterceptor.name,
          );
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'Unhandled request error';
          const stack = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            {
              event: 'request_error',
              method: request.method,
              path: request.url,
              statusCode: response.statusCode,
              durationMs: Date.now() - startedAt,
              requestId: request.headers['x-request-id'],
              message,
            },
            stack,
            LoggingInterceptor.name,
          );
        },
      }),
    );
  }
}
