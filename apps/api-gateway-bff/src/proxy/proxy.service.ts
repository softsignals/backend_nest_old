import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { JsonLoggerService } from '@app/common';
import type { Request } from 'express';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProxyService {
  constructor(
    private readonly http: HttpService,
    private readonly logger: JsonLoggerService,
  ) {}

  async forward(
    request: Request,
    targetBaseUrl: string,
    targetPath: string,
    options?: { params?: Record<string, unknown> },
  ): Promise<unknown> {
    const url = `${targetBaseUrl}${targetPath}`;
    const isGetOrHead = request.method === 'GET' || request.method === 'HEAD';
    const requestBody: unknown = request.body as unknown;
    const params = options?.params ?? request.query;
    const headers: Record<string, string> = {
      'x-request-id': (request.headers['x-request-id'] as string) ?? '',
      ...(request.headers.authorization && {
        authorization: request.headers.authorization,
      }),
      ...(request.headers['idempotency-key'] && {
        'idempotency-key': request.headers['idempotency-key'] as string,
      }),
    };
    if (!isGetOrHead && request.headers['content-type']) {
      headers['content-type'] =
        request.headers['content-type'] ?? 'application/json';
    }

    try {
      const response = await firstValueFrom(
        this.http.request({
          url,
          method: request.method,
          ...(isGetOrHead ? {} : { data: requestBody }),
          params,
          headers,
          validateStatus: () => true,
        }),
      );

      if (response.status >= 400) {
        const errorPayload: unknown = response.data as unknown;
        throw new HttpException(
          errorPayload ?? { message: 'Upstream service error' },
          response.status,
        );
      }

      return response.data as unknown;
    } catch (err: unknown) {
      this.logger.warn(
        {
          event: 'upstream_error',
          target: `${targetBaseUrl}${targetPath}`,
          error: err instanceof Error ? err.message : String(err),
        },
        ProxyService.name,
      );
      const statusCode =
        (err as { response?: { status?: number }; status?: number })?.response
          ?.status ??
        (err as { status?: number })?.status ??
        502;
      const payload = (err as { response?: { data?: unknown } })?.response
        ?.data ?? {
        message: 'Gateway upstream unavailable',
      };
      throw new HttpException(payload, statusCode);
    }
  }
}
