import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { TelegramExceptionFilter } from './common/filters/telegram-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { initializeBot } from './bot';
import * as fs from 'fs';
import * as path from 'path';
import * as basicAuth from 'express-basic-auth';

async function bootstrap() {
    // Set timezone to Tashkent/Uzbekistan
    process.env.TZ = 'Asia/Tashkent';
    
    const configService = new ConfigService();
    
    // SSL Configuration
    const enableSSL = configService.get<string>('ENABLE_SSL', 'false') === 'true';
    const sslKeyPath = configService.get<string>('SSL_KEY_PATH', path.join(process.cwd(), 'ssl/certs/server.key'));
    const sslCertPath = configService.get<string>('SSL_CERT_PATH', path.join(process.cwd(), 'ssl/certs/server.crt'));
    
    let httpsOptions: any = undefined;
    
    if (enableSSL) {
        try {
            const keyFile = fs.readFileSync(sslKeyPath);
            const certFile = fs.readFileSync(sslCertPath);
            
            httpsOptions = {
                key: keyFile,
                cert: certFile,
            };
        } catch (error) {
            console.error('SSL Certificate files not found or invalid:', error.message);
            console.log('Falling back to HTTP mode');
        }
    }
    
    const app = await NestFactory.create(AppModule, { httpsOptions });

    const appConfigService = app.get(ConfigService);
    const port = appConfigService.get<number>('PORT', enableSSL ? 3443 : 3000);

    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new TelegramExceptionFilter(appConfigService));
    app.useGlobalInterceptors(new LoggingInterceptor());
    // CORS is handled by nginx reverse proxy
    // app.enableCors({
    //     origin: '*',
    //     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    //     // allowedHeaders: ['Content-Type', 'Authorization'],
    // });

    // Basic Auth for Swagger
    const swaggerUsername = appConfigService.get<string>('SWAGGER_USERNAME', 'admin');
    const swaggerPassword = appConfigService.get<string>('SWAGGER_PASSWORD', 'yVCu6*9J');
    
    if (swaggerUsername && swaggerPassword) {
        app.use('/api/docs*splat', basicAuth({
            users: { [swaggerUsername]: swaggerPassword },
            challenge: true,
            realm: 'EduMasters API Documentation',
        }));
    }

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

    const protocol = enableSSL && httpsOptions ? 'https' : 'http';
    const url = `${protocol}://localhost:${port}`;
    logger.log(`🚀 App running on ${url}`);
    
    if (swaggerUsername && swaggerPassword) {
        logger.log(`📚 Swagger docs at ${url}/api/docs (Basic Auth enabled)`);
    } else {
        logger.log(`📚 Swagger docs at ${url}/api/docs (No authentication)`);
        logger.warn(`⚠️  Consider setting SWAGGER_USERNAME and SWAGGER_PASSWORD for production`);
    }
    
    if (enableSSL && httpsOptions) {
        logger.log(`🔒 SSL/HTTPS enabled with certificates`);
    } else if (enableSSL) {
        logger.log(`⚠️  SSL was requested but certificates not found, running HTTP instead`);
    } else {
        logger.log(`🔓 Running in HTTP mode`);
    }

    logger.log("Initializing bot...");
    await initializeBot();
}

void bootstrap();
