import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  private readonly authServiceUrl: string;
  private readonly timbratureServiceUrl: string;

  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    configService: ConfigService,
  ) {
    this.authServiceUrl = configService.getOrThrow<string>('AUTH_SERVICE_URL');
    this.timbratureServiceUrl = configService.getOrThrow<string>(
      'TIMBRATURE_SERVICE_URL',
    );
  }

  @Get('live')
  live() {
    return {
      status: 'up',
    };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () =>
        this.http.pingCheck(
          'auth-service',
          `${this.authServiceUrl}/health/ready`,
        ),
      () =>
        this.http.pingCheck(
          'timbrature-service',
          `${this.timbratureServiceUrl}/health/ready`,
        ),
    ]);
  }
}
