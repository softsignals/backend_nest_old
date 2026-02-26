import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async pingCheck(key = 'redis'): Promise<HealthIndicatorResult> {
    const client = new Redis({
      host: this.configService.getOrThrow<string>('REDIS_HOST'),
      port: Number(this.configService.get<string>('REDIS_PORT', '6379')),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    try {
      await client.connect();
      const pong = await client.ping();
      const isHealthy = pong === 'PONG';

      const result = this.getStatus(key, isHealthy);
      if (!isHealthy) {
        throw new HealthCheckError('Redis check failed', result);
      }

      return result;
    } catch {
      const result = this.getStatus(key, false);
      throw new HealthCheckError('Redis check failed', result);
    } finally {
      client.disconnect();
    }
  }
}
