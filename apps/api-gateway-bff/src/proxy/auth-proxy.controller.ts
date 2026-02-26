import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ProxyService } from './proxy.service';

@Controller('auth')
export class AuthProxyController {
  private readonly authServiceUrl: string;

  constructor(
    private readonly proxyService: ProxyService,
    configService: ConfigService,
  ) {
    this.authServiceUrl = configService.getOrThrow<string>('AUTH_SERVICE_URL');
  }

  @Post('login')
  login(@Req() req: Request, @Body() body: unknown) {
    req.body = body;
    return this.proxyService.forward(req, this.authServiceUrl, '/auth/login');
  }

  @Post('refresh')
  refresh(@Req() req: Request, @Body() body: unknown) {
    req.body = body;
    return this.proxyService.forward(req, this.authServiceUrl, '/auth/refresh');
  }

  @Post('logout')
  logout(@Req() req: Request, @Body() body: unknown) {
    req.body = body;
    return this.proxyService.forward(req, this.authServiceUrl, '/auth/logout');
  }

  @Post('logout-all')
  logoutAll(@Req() req: Request) {
    return this.proxyService.forward(
      req,
      this.authServiceUrl,
      '/auth/logout-all',
    );
  }

  @Get('me')
  me(@Req() req: Request) {
    return this.proxyService.forward(req, this.authServiceUrl, '/auth/me');
  }

  @Get('permissions')
  permissions(@Req() req: Request) {
    if (!req.headers.authorization) {
      throw new UnauthorizedException('Missing authorization header');
    }
    return this.proxyService.forward(
      req,
      this.authServiceUrl,
      '/auth/permissions',
    );
  }
}
