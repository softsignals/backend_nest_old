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
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { UserEntity } from './auth/entities/user.entity';
import { RefreshSessionEntity } from './auth/entities/refresh-session.entity';
import { LoginAttemptEntity } from './auth/entities/login-attempt.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TerminusModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url: configService.getOrThrow<string>('DATABASE_URL'),
        entities: [UserEntity, RefreshSessionEntity, LoginAttemptEntity],
        synchronize: false,
      }),
    }),
    AuthModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
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
