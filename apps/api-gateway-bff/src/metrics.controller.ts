import { Controller, Get } from '@nestjs/common';

@Controller('metrics')
export class MetricsController {
  @Get()
  getMetrics() {
    return {
      service: 'api-gateway-bff',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryRssBytes: process.memoryUsage().rss,
      timestamp: Date.now(),
    };
  }
}
