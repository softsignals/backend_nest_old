import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ProxyService } from './proxy.service';

@Controller('commesse')
export class CommesseProxyController {
  private readonly timbratureServiceUrl: string;

  constructor(
    private readonly proxyService: ProxyService,
    configService: ConfigService,
  ) {
    this.timbratureServiceUrl = configService.getOrThrow<string>(
      'TIMBRATURE_SERVICE_URL',
    );
  }

  @Post()
  create(@Req() req: Request, @Body() body: unknown) {
    req.body = body;
    return this.proxyService.forward(
      req,
      this.timbratureServiceUrl,
      '/commesse',
    );
  }

  @Get()
  list(@Req() req: Request) {
    return this.proxyService.forward(
      req,
      this.timbratureServiceUrl,
      '/commesse',
    );
  }

  @Get(':id')
  getById(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward(
      req,
      this.timbratureServiceUrl,
      `/commesse/${id}`,
    );
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    req.body = body;
    return this.proxyService.forward(
      req,
      this.timbratureServiceUrl,
      `/commesse/${id}`,
    );
  }

  @Post(':id/qr/regenerate')
  regenerateQr(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    req.body = body;
    return this.proxyService.forward(
      req,
      this.timbratureServiceUrl,
      `/commesse/${id}/qr/regenerate`,
    );
  }

  @Get(':id/qr/history')
  history(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward(
      req,
      this.timbratureServiceUrl,
      `/commesse/${id}/qr/history`,
    );
  }
}
