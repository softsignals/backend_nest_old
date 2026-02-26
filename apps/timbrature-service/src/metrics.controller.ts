import { Controller, Get } from '@nestjs/common';

@Controller('metrics')
export class MetricsController {
  @Get()
  getMetrics() {
    return {
      service: 'timbrature-service',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryRssBytes: process.memoryUsage().rss,
      timestamp: Date.now(),
    };
  }
}
