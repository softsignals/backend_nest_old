import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  JsonLoggerService,
  LoggingInterceptor,
  RequestIdMiddleware,
} from '@app/common';
import { CommesseModule } from './commesse/commesse.module';
import { CommessaEntity } from './commesse/entities/commessa.entity';
import { QrCodeRevisionEntity } from './commesse/entities/qr-code-revision.entity';
import { RedisHealthIndicator } from './health/redis.health-indicator';
import { TimbratureModule } from './timbrature/timbrature.module';
import { TimbraturaEntity } from './timbrature/entities/timbratura.entity';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TerminusModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const sslEnabled =
          configService.get<string>('DATABASE_SSL', 'false') === 'true';
        const rejectUnauthorized =
          configService.get<string>(
            'DATABASE_SSL_REJECT_UNAUTHORIZED',
            'false',
          ) === 'true';

        return {
          type: 'postgres' as const,
          url: configService.getOrThrow<string>('DATABASE_URL'),
          ssl: sslEnabled ? { rejectUnauthorized } : false,
          entities: [TimbraturaEntity, CommessaEntity, QrCodeRevisionEntity],
          synchronize: false,
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: Number(configService.get<string>('REDIS_PORT', '6379')),
        },
      }),
    }),
    TimbratureModule,
    CommesseModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    RedisHealthIndicator,
    JsonLoggerService,
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
