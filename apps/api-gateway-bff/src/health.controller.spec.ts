import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('Gateway HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: { check: jest.fn().mockResolvedValue({ status: 'ok' }) },
        },
        {
          provide: HttpHealthIndicator,
          useValue: {
            pingCheck: jest.fn().mockResolvedValue({ status: 'up' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) =>
              key === 'AUTH_SERVICE_URL'
                ? 'http://localhost:3001'
                : 'http://localhost:3002',
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns live status', () => {
    expect(controller.live()).toEqual({ status: 'up' });
  });
});
