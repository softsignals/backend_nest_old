import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import * as YAML from 'yamljs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const openApiPath = join(process.cwd(), 'openapi.yaml'); // <-- QUI
  const document = YAML.load(openApiPath);

  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
  console.log('Swagger on http://localhost:3000/api');
}
bootstrap();
