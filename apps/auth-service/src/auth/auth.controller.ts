import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Permissions } from './decorators/permissions.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.deviceId);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken, dto.deviceId);
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  logoutAll(@Req() req: Request & { user: { sub: string } }) {
    return this.authService.logoutAll(req.user.sub);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: { sub: string } }) {
    return this.authService.me(req.user.sub);
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('auth:read-permissions')
  permissions(@Req() req: Request & { user: { permissions: string[] } }) {
    return {
      permissions: req.user.permissions,
    };
  }
}
