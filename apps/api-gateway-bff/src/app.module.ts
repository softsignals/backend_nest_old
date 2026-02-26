import { HttpModule } from '@nestjs/axios';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  JsonLoggerService,
  LoggingInterceptor,
  RequestIdMiddleware,
} from '@app/common';
import { AuthProxyController } from './proxy/auth-proxy.controller';
import { CommesseProxyController } from './proxy/commesse-proxy.controller';
import { ProxyService } from './proxy/proxy.service';
import { TimbratureProxyController } from './proxy/timbrature-proxy.controller';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    TerminusModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
  ],
  controllers: [
    HealthController,
    MetricsController,
    AuthProxyController,
    TimbratureProxyController,
    CommesseProxyController,
  ],
  providers: [
    ProxyService,
    JsonLoggerService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
