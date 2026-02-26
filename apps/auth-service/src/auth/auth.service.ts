import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { RefreshSessionEntity } from './entities/refresh-session.entity';
import { RoleEnum, UserEntity } from './entities/user.entity';

interface JwtPayload {
  sub: string;
  role: RoleEnum;
  permissions: string[];
  tokenVersion: number;
}

const ROLE_PERMISSIONS: Record<RoleEnum, string[]> = {
  [RoleEnum.ADMIN]: [
    'auth:read-permissions',
    'timbrature:write',
    'timbrature:read',
  ],
  [RoleEnum.MANAGER]: ['timbrature:write', 'timbrature:read'],
  [RoleEnum.DIPENDENTE]: ['timbrature:write', 'timbrature:read'],
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RefreshSessionEntity)
    private readonly sessionsRepository: Repository<RefreshSessionEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultAdmin();
  }

  private getPermissions(role: RoleEnum): string[] {
    return ROLE_PERMISSIONS[role] ?? [];
  }

  private async seedDefaultAdmin(): Promise<void> {
    const adminEmail = this.configService.get<string>('AUTH_ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('AUTH_ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) return;

    const existingUser = await this.usersRepository.findOne({
      where: { email: adminEmail },
    });
    if (existingUser) return;

    const passwordHash = await argon2.hash(adminPassword);
    const user = this.usersRepository.create({
      codiceDipendente: this.configService.get<string>(
        'AUTH_ADMIN_CODICE_DIPENDENTE',
        'ADMIN-0001',
      ),
      nome: this.configService.get<string>('AUTH_ADMIN_NOME', 'Admin'),
      cognome: this.configService.get<string>('AUTH_ADMIN_COGNOME', 'User'),
      email: adminEmail,
      passwordHash,
      ruolo: RoleEnum.ADMIN,
      attivo: true,
      dataAssunzione: this.configService.get<string>(
        'AUTH_ADMIN_DATA_ASSUNZIONE',
        '2000-01-01',
      ),
      note: 'Seeded admin user',
    });
    await this.usersRepository.save(user);
  }

  async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user || !user.attivo || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private buildPayload(user: UserEntity): JwtPayload {
    return {
      sub: user.id,
      role: user.ruolo,
      permissions: this.getPermissions(user.ruolo),
      tokenVersion: user.tokenVersion,
    };
  }

  private async createSessionAndToken(user: UserEntity, deviceId: string) {
    const refreshTtlDays = Number(
      this.configService.get<string>('JWT_REFRESH_TTL_DAYS', '7'),
    );
    const rawToken =
      randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');

    const session = this.sessionsRepository.create({
      userId: user.id,
      deviceId,
      tokenHash: '',
      expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
    });
    const savedSession = await this.sessionsRepository.save(session);

    const refreshToken = `${savedSession.id}.${rawToken}`;
    savedSession.tokenHash = await argon2.hash(refreshToken);
    await this.sessionsRepository.save(savedSession);

    return {
      refreshToken,
      expiresIn: 900,
      accessToken: this.jwtService.sign(this.buildPayload(user)),
      role: user.ruolo,
      permissions: this.getPermissions(user.ruolo),
    };
  }

  async login(email: string, password: string, deviceId: string) {
    const user = await this.validateUser(email, password);
    await this.usersRepository.update(
      { id: user.id },
      { lastLoginAt: new Date() },
    );
    return this.createSessionAndToken(user, deviceId);
  }

  async refresh(refreshToken: string, deviceId: string) {
    const sessionId = refreshToken.split('.')[0];
    if (!sessionId) {
      throw new UnprocessableEntityException('Invalid refresh token format');
    }

    const session = await this.sessionsRepository.findOne({
      where: {
        id: sessionId,
        deviceId,
        revokedAt: IsNull(),
      },
      relations: { user: true },
    });

    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh session expired or invalid');
    }

    const valid = await argon2.verify(session.tokenHash, refreshToken);
    if (!valid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    session.revokedAt = new Date();
    await this.sessionsRepository.save(session);

    return this.createSessionAndToken(session.user, deviceId);
  }

  async logout(refreshToken: string): Promise<{ ok: boolean }> {
    const sessionId = refreshToken.split('.')[0];
    if (!sessionId) {
      return { ok: true };
    }
    await this.sessionsRepository.update(
      { id: sessionId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return { ok: true };
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionsRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async me(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('User not found');

    return {
      id: user.id,
      codiceDipendente: user.codiceDipendente,
      nome: user.nome,
      cognome: user.cognome,
      email: user.email,
      ruolo: user.ruolo,
      role: user.ruolo,
      reparto: user.reparto,
      qualifica: user.qualifica,
      attivo: user.attivo,
      dataAssunzione: user.dataAssunzione,
      permissions: this.getPermissions(user.ruolo),
    };
  }
}
