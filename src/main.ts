import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { TelegramExceptionFilter } from './common/filters/telegram-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { initializeBot } from './bot';

async function bootstrap() {
    // Set timezone to Tashkent/Uzbekistan
    process.env.TZ = 'Asia/Tashkent';
    
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);

    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new TelegramExceptionFilter(configService));
    app.useGlobalInterceptors(new LoggingInterceptor());
    app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        // allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Swagger setup
    const swaggerConfig = new DocumentBuilder()
        .setTitle('EduMasters API')
        .setDescription('Edumasters backend endpoints')
        .setVersion('1.0')
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(port, '0.0.0.0');
    const logger = new Logger('Bootstrap');

    const url = await app.getUrl();
    logger.log(`🚀 App running on ${url}`);
    logger.log(`📚 Swagger docs at ${url}/api/docs`);

    logger.log("Initializing bot...");
    await initializeBot();
}

void bootstrap();
