import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ApiModule } from './openapi/api.module';

@Module({
  imports: [AuthModule, ApiModule],
})
export class AppModule {}