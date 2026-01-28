import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: readFileSync(join(process.cwd(), 'keys/public.pem')),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      role: payload.role,
      deviceId: payload.deviceId,
      tokenVersion: payload.tokenVersion,
    };
  }
}
