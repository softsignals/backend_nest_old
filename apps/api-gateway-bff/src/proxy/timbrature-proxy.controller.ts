import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ProxyService } from './proxy.service';

@Controller('timbrature')
export class TimbratureProxyController {
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
      '/timbrature',
    );
  }

  @Get()
  list(@Req() req: Request, @Query() query: Record<string, string>) {
    return this.proxyService.forward(
      req,
      this.timbratureServiceUrl,
      '/timbrature',
      { params: query },
    );
  }

  @Get('jobs/:jobId')
  jobStatus(@Req() req: Request, @Param('jobId') jobId: string) {
    return this.proxyService.forward(
      req,
      this.timbratureServiceUrl,
      `/timbrature/jobs/${jobId}`,
    );
  }
}
