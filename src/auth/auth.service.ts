import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateUser(email: string, password: string) {
    // TODO: recuperare utente dal DB
    const fakeUser = {
      id: 'user-1',
      passwordHash: await argon2.hash('password'),
      role: 'DIPENDENTE',
      tokenVersion: 1,
    };

    const valid = await argon2.verify(fakeUser.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return fakeUser;
  }

  async login(user: any, deviceId: string) {
    const payload = {
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
      deviceId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomUUID(); // verrà hashato e salvato in DB

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }
}
