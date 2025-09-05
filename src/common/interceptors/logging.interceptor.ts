import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, headers, body, query, params } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = headers['x-forwarded-for'] || request.connection.remoteAddress || 'unknown';

    // Skip logging for health check endpoints
    const healthCheckPaths = ['/health', '/healthz', '/ping', '/status', '/api/health'];
    if (healthCheckPaths.some(path => url.includes(path))) {
      return next.handle();
    }

    const startTime = Date.now();

    // Log request
    this.logger.log(
      `🚀 ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`,
    );

    // Log request details (excluding sensitive data)
    const requestDetails = {
      method,
      url,
      query: Object.keys(query).length > 0 ? query : undefined,
      params: Object.keys(params).length > 0 ? params : undefined,
      body: this.sanitizeBody(body),
      headers: this.sanitizeHeaders(headers),
    };

    this.logger.debug('📤 Request Details:', JSON.stringify(requestDetails, null, 2));

    return next.handle().pipe(
      tap((data) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode = response.statusCode;

        // Log response
        this.logger.log(
          `✅ ${method} ${url} - ${statusCode} - ${duration}ms`,
        );

        // Log response details (limit data size for large responses)
        const responseDetails = {
          statusCode,
          duration: `${duration}ms`,
          dataSize: this.getDataSize(data),
          data: this.truncateData(data),
        };

        this.logger.debug('📥 Response Details:', JSON.stringify(responseDetails, null, 2));
      }),
      catchError((error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode = error.status || 500;

        // Log error
        this.logger.error(
          `❌ ${method} ${url} - ${statusCode} - ${duration}ms - ${error.message}`,
        );

        // Log error details
        const errorDetails = {
          statusCode,
          duration: `${duration}ms`,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        };

        this.logger.error('📥 Error Details:', JSON.stringify(errorDetails, null, 2));

        throw error;
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    // sensitiveFields.forEach(field => {
    //   if (sanitized[field]) {
    //     sanitized[field] = '[REDACTED]';
    //   }
    // });

    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    // sensitiveHeaders.forEach(header => {
    //   if (sanitized[header]) {
    //     sanitized[header] = '[REDACTED]';
    //   }
    // });

    return sanitized;
  }

  private getDataSize(data: any): string {
    if (!data) return '0 bytes';
    
    const size = JSON.stringify(data).length;
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  private truncateData(data: any, maxLength: number = 1000): any {
    if (!data) return data;

    const dataStr = JSON.stringify(data);
    if (dataStr.length <= maxLength) return data;

    return {
      ...data,
      _truncated: true,
      _originalSize: dataStr.length,
      _message: `Data truncated. Original size: ${dataStr.length} characters`,
    };
  }
}
