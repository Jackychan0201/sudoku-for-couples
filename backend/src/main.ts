// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded, text } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ✅ handle urlencoded (for form data)
  app.use(urlencoded({ extended: true }));

  // ✅ handle json
  app.use(json());

  // ✅ handle raw text (some Pusher setups send this way)
  app.use(text({ type: 'application/x-www-form-urlencoded' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(3001);
  console.log('🚀 Backend running on http://localhost:3001');
}
bootstrap();
