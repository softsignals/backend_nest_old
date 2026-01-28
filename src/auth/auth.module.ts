import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { readFileSync } from 'fs';
import { join } from 'path';

const privateKey = readFileSync(join(process.cwd(), 'keys/private.pem'));
const publicKey = readFileSync(join(process.cwd(), 'keys/public.pem'));

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      privateKey,
      publicKey,
      signOptions: {
        algorithm: 'RS256',
        expiresIn: '15m',
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
