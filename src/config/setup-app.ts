import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from '../prisma/prisma-exception.filter';

export function setupApp(app: INestApplication, origins: string[]) {
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: origins });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableShutdownHooks();
}
