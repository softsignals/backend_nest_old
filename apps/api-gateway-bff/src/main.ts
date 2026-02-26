import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { existsSync } from 'fs';
import { join } from 'path';
import * as YAML from 'yamljs';
import { GlobalHttpExceptionFilter, JsonLoggerService } from '@app/common';
import { AppModule } from './app.module';

function parseOrigins(origins?: string): string[] {
  if (!origins) return [];
  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function corsOriginFromEnv(origins?: string): string[] | boolean {
  const parsed = parseOrigins(origins);
  if (parsed.length === 0) return true;
  if (parsed.includes('*')) return true;
  return parsed;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(JsonLoggerService));

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: corsOriginFromEnv(process.env.GATEWAY_CORS_ORIGINS),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  if (process.env.GATEWAY_SWAGGER_ENABLED !== 'false') {
    const openApiPath = join(process.cwd(), 'openapi.yaml');
    if (existsSync(openApiPath)) {
      const document = YAML.load(openApiPath);
      SwaggerModule.setup('api/docs', app, document);
    } else {
      // In container runtime the OpenAPI file may not be present; do not block startup.
      console.warn(`Swagger disabled: missing file ${openApiPath}`);
    }
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
