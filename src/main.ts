import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { TelegramExceptionFilter } from './common/filters/telegram-exception.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);

    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new TelegramExceptionFilter(configService));

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
}

void bootstrap();
